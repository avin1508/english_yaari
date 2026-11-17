import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../src/app';
import { Session } from '../../src/modules/session/session.model';
import { Teacher } from '../../src/modules/teacher/teacher.model';
import { User } from '../../src/modules/user/user.model';

beforeAll(async () => {
  const databaseName = `teacher-session-booking-session-tests-${process.pid}`;
  await mongoose.connect(`mongodb://127.0.0.1:27017/${databaseName}`);
  await Promise.all([Session.syncIndexes(), Teacher.syncIndexes(), User.syncIndexes()]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('POST /sessions', () => {
  let teacherId: string;

  beforeEach(async () => {
    await Session.deleteMany({});
    await Teacher.deleteMany({});
    const teacher = await Teacher.create({
      fullName: 'Ananya Sharma',
      email: 'ananya.sharma@example.com',
      specialization: 'Mathematics',
      experience: 8,
    });
    teacherId = teacher.id;
  });

  const createSession = (overrides: Record<string, unknown> = {}): request.Test => {
    return request(app)
      .post('/sessions')
      .send({
        teacherId,
        startTime: '2026-11-20T10:00:00.000Z',
        endTime: '2026-11-20T11:00:00.000Z',
        ...overrides,
      });
  };

  it('creates a session with the required defaults', async () => {
    const response = await createSession();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Session created successfully',
      data: {
        teacherId,
        userId: null,
        startTime: '2026-11-20T10:00:00.000Z',
        endTime: '2026-11-20T11:00:00.000Z',
        status: 'AVAILABLE',
        completedAt: null,
      },
    });
  });

  describe('PATCH /sessions/:id/complete', () => {
    let sessionId: string;
    let userId: string;

    beforeEach(async () => {
      await Session.deleteMany({});
      await Teacher.deleteMany({});
      await User.deleteMany({});

      const [teacher, user] = await Promise.all([
        Teacher.create({
          fullName: 'Completion Teacher',
          email: 'completion.teacher@example.com',
          specialization: 'Science',
          experience: 7,
        }),
        User.create({
          fullName: 'Completed Session User',
          email: 'completed.session.user@example.com',
          phone: '3333333333',
        }),
      ]);

      userId = user.id;
      const session = await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-11-20T10:00:00.000Z'),
        endTime: new Date('2026-11-20T11:00:00.000Z'),
        status: 'BOOKED',
      });
      sessionId = session.id;
    });

    it('completes a booked session and preserves its user', async () => {
      const response = await request(app).patch(`/sessions/${sessionId}/complete`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Session completed successfully',
        data: {
          _id: sessionId,
          userId,
          status: 'COMPLETED',
        },
      });
      expect(response.body.data.completedAt).toBeDefined();
      expect(Number.isNaN(new Date(response.body.data.completedAt).getTime())).toBe(false);

      const storedSession = await Session.findById(sessionId);
      expect(storedSession?.status).toBe('COMPLETED');
      expect(storedSession?.completedAt).toBeInstanceOf(Date);
      expect(storedSession?.completedAt?.getTime()).not.toBeNaN();
      expect(storedSession?.userId?.toString()).toBe(userId);
    });

    it('returns 404 when the session does not exist', async () => {
      const response = await request(app).patch(
        `/sessions/${new mongoose.Types.ObjectId().toString()}/complete`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ success: false, message: 'Session not found' });
    });

    it('rejects an invalid session ID', async () => {
      const response = await request(app).patch('/sessions/not-an-object-id/complete');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 409 when the session is available', async () => {
      await Session.findByIdAndUpdate(sessionId, { status: 'AVAILABLE', userId: null });

      const response = await request(app).patch(`/sessions/${sessionId}/complete`);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Session cannot be completed because it is AVAILABLE',
      });
    });

    it('returns 409 when the session is already completed', async () => {
      await Session.findByIdAndUpdate(sessionId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const response = await request(app).patch(`/sessions/${sessionId}/complete`);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Session cannot be completed because it is COMPLETED',
      });
    });

    it('allows exactly one of five concurrent completion requests', async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, () => request(app).patch(`/sessions/${sessionId}/complete`)),
      );

      expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
      expect(responses.filter((response) => response.status === 409)).toHaveLength(4);

      const storedSession = await Session.findById(sessionId);
      expect(storedSession?.status).toBe('COMPLETED');
      expect(storedSession?.completedAt).toBeInstanceOf(Date);
      expect(storedSession?.userId?.toString()).toBe(userId);
    });
  });

  describe('POST /sessions/:id/book', () => {
    let sessionId: string;
    let firstUserId: string;
    let secondUserId: string;

    beforeEach(async () => {
      await Session.deleteMany({});
      await Teacher.deleteMany({});
      await User.deleteMany({});

      const [teacher, firstUser, secondUser] = await Promise.all([
        Teacher.create({
          fullName: 'Ananya Sharma',
          email: 'booking.teacher@example.com',
          specialization: 'Mathematics',
          experience: 8,
        }),
        User.create({
          fullName: 'First User',
          email: 'first.booking.user@example.com',
          phone: '1111111111',
        }),
        User.create({
          fullName: 'Second User',
          email: 'second.booking.user@example.com',
          phone: '2222222222',
        }),
      ]);

      firstUserId = firstUser.id;
      secondUserId = secondUser.id;
      const session = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-11-20T10:00:00.000Z'),
        endTime: new Date('2026-11-20T11:00:00.000Z'),
      });
      sessionId = session.id;
    });

    it('books an available session and associates it with the user', async () => {
      const response = await request(app)
        .post(`/sessions/${sessionId}/book`)
        .send({ userId: firstUserId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Session booked successfully',
        data: {
          _id: sessionId,
          userId: firstUserId,
          status: 'BOOKED',
        },
      });

      const storedSession = await Session.findById(sessionId);
      expect(storedSession?.status).toBe('BOOKED');
      expect(storedSession?.userId?.toString()).toBe(firstUserId);
    });

    it('returns 404 when the user does not exist', async () => {
      const response = await request(app)
        .post(`/sessions/${sessionId}/book`)
        .send({ userId: new mongoose.Types.ObjectId().toString() });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ success: false, message: 'User not found' });
      expect((await Session.findById(sessionId))?.status).toBe('AVAILABLE');
    });

    it('returns 404 when the session does not exist', async () => {
      const missingSessionId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/sessions/${missingSessionId}/book`)
        .send({ userId: firstUserId });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ success: false, message: 'Session not found' });
    });

    it('rejects an invalid session ID', async () => {
      const response = await request(app).post('/sessions/not-an-object-id/book').send({
        userId: firstUserId,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an invalid user ID', async () => {
      const response = await request(app)
        .post(`/sessions/${sessionId}/book`)
        .send({ userId: 'not-an-object-id' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 409 when the session is already booked', async () => {
      await Session.findByIdAndUpdate(sessionId, {
        status: 'BOOKED',
        userId: firstUserId,
      });

      const response = await request(app)
        .post(`/sessions/${sessionId}/book`)
        .send({ userId: secondUserId });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Session cannot be booked because it is BOOKED',
      });
    });

    it('returns 409 when the session is completed', async () => {
      await Session.findByIdAndUpdate(sessionId, {
        status: 'COMPLETED',
        userId: firstUserId,
        completedAt: new Date(),
      });

      const response = await request(app)
        .post(`/sessions/${sessionId}/book`)
        .send({ userId: secondUserId });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Session cannot be booked because it is COMPLETED',
      });
    });

    it('allows exactly one of five simultaneous booking requests', async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          request(app)
            .post(`/sessions/${sessionId}/book`)
            .send({ userId: index % 2 === 0 ? firstUserId : secondUserId }),
        ),
      );

      const successfulResponses = responses.filter((response) => response.status === 200);
      const conflictResponses = responses.filter((response) => response.status === 409);

      expect(successfulResponses).toHaveLength(1);
      expect(conflictResponses).toHaveLength(4);
      expect(conflictResponses.every((response) => response.body.success === false)).toBe(true);

      const storedSession = await Session.findById(sessionId);
      expect(storedSession?.status).toBe('BOOKED');
      expect([firstUserId, secondUserId]).toContain(storedSession?.userId?.toString());
    });
  });

  describe('GET /sessions/available', () => {
    let teacherId: mongoose.Types.ObjectId;
    const dateTimestamp = Date.UTC(2026, 10, 20, 12);

    beforeEach(async () => {
      await Session.deleteMany({});
      await Teacher.deleteMany({});
      const teacher = await Teacher.create({
        fullName: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        specialization: 'Mathematics',
        experience: 5,
      });
      teacherId = teacher._id;
    });

    const insertSession = async (
      startTime: string,
      endTime: string,
      status: 'AVAILABLE' | 'BOOKED' | 'COMPLETED' = 'AVAILABLE',
    ): Promise<void> => {
      await Session.create({
        teacherId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status,
      });
    };

    it('returns available sessions with teacher details sorted by start time', async () => {
      await insertSession('2026-11-20T12:00:00.000Z', '2026-11-20T13:00:00.000Z');
      await insertSession('2026-11-20T09:00:00.000Z', '2026-11-20T10:00:00.000Z');

      const response = await request(app).get('/sessions/available').query({ dateTimestamp });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Available sessions fetched successfully');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        teacher: {
          _id: teacherId.toString(),
          fullName: 'Rahul Sharma',
          specialization: 'Mathematics',
          experience: 5,
        },
        startTime: '2026-11-20T09:00:00.000Z',
        endTime: '2026-11-20T10:00:00.000Z',
        status: 'AVAILABLE',
      });
      expect(new Date(response.body.data[0].startTime).getTime()).toBeLessThan(
        new Date(response.body.data[1].startTime).getTime(),
      );
      expect(response.body.data[0].teacherId).toBeUndefined();
    });

    it('requires dateTimestamp', async () => {
      const response = await request(app).get('/sessions/available');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects a non-numeric timestamp', async () => {
      const response = await request(app)
        .get('/sessions/available')
        .query({ dateTimestamp: 'not-a-timestamp' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects a numeric timestamp outside the valid Date range', async () => {
      const response = await request(app)
        .get('/sessions/available')
        .query({ dateTimestamp: '8640000000000001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns an empty list when no available sessions match the date', async () => {
      const response = await request(app).get('/sessions/available').query({ dateTimestamp });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('excludes sessions from another UTC date', async () => {
      await insertSession('2026-11-21T00:00:00.000Z', '2026-11-21T01:00:00.000Z');

      const response = await request(app).get('/sessions/available').query({ dateTimestamp });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it.each(['BOOKED', 'COMPLETED'] as const)('excludes %s sessions', async (status) => {
      await insertSession('2026-11-20T10:00:00.000Z', '2026-11-20T11:00:00.000Z', status);

      const response = await request(app).get('/sessions/available').query({ dateTimestamp });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('complete booking workflow', () => {
    beforeEach(async () => {
      await Promise.all([Session.deleteMany({}), Teacher.deleteMany({}), User.deleteMany({})]);
    });

    it('creates, lists, books, completes, and returns a user session consistently', async () => {
      const userResponse = await request(app).post('/users').send({
        fullName: 'Workflow User',
        email: 'workflow.user@example.com',
        phone: '5551234567',
      });
      expect(userResponse.status).toBe(201);
      const userId = userResponse.body.data._id as string;

      const teacher = await Teacher.create({
        fullName: 'Workflow Teacher',
        email: 'workflow.teacher@example.com',
        specialization: 'Mathematics',
        experience: 9,
      });

      const sessionResponse = await request(app).post('/sessions').send({
        teacherId: teacher.id,
        startTime: '2026-11-25T10:00:00.000Z',
        endTime: '2026-11-25T11:00:00.000Z',
      });
      expect(sessionResponse.status).toBe(201);

      const sessionId = sessionResponse.body.data._id as string;
      expect(sessionResponse.body.data).toMatchObject({
        status: 'AVAILABLE',
        userId: null,
        completedAt: null,
      });

      const dateTimestamp = Date.UTC(2026, 10, 25);
      const availableResponse = await request(app)
        .get('/sessions/available')
        .query({ dateTimestamp });
      expect(availableResponse.status).toBe(200);
      expect(availableResponse.body.data.map((session: { _id: string }) => session._id)).toContain(
        sessionId,
      );

      const bookingResponse = await request(app)
        .post(`/sessions/${sessionId}/book`)
        .send({ userId });
      expect(bookingResponse.status).toBe(200);
      expect(bookingResponse.body.data).toMatchObject({
        _id: sessionId,
        userId,
        status: 'BOOKED',
        completedAt: null,
      });

      const bookedSession = await Session.findById(sessionId);
      expect(bookedSession?.status).toBe('BOOKED');
      expect(bookedSession?.userId?.toString()).toBe(userId);
      expect(bookedSession?.completedAt).toBeNull();

      const noLongerAvailable = await request(app)
        .get('/sessions/available')
        .query({ dateTimestamp });
      expect(noLongerAvailable.status).toBe(200);
      expect(noLongerAvailable.body.data).toEqual([]);

      const completionResponse = await request(app).patch(`/sessions/${sessionId}/complete`);
      expect(completionResponse.status).toBe(200);
      expect(completionResponse.body.data).toMatchObject({
        _id: sessionId,
        userId,
        status: 'COMPLETED',
      });
      expect(Number.isNaN(new Date(completionResponse.body.data.completedAt).getTime())).toBe(
        false,
      );

      const completedSession = await Session.findById(sessionId);
      expect(completedSession?.status).toBe('COMPLETED');
      expect(completedSession?.userId?.toString()).toBe(userId);
      expect(completedSession?.completedAt).toBeInstanceOf(Date);
      expect(completedSession?.completedAt?.getTime()).not.toBeNaN();

      const historyResponse = await request(app).get(`/users/${userId}/sessions`);
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.upcomingSessions).toEqual([]);
      expect(historyResponse.body.data.completedSessions).toHaveLength(1);
      expect(historyResponse.body.data.completedSessions[0]).toMatchObject({
        _id: sessionId,
        userId,
        status: 'COMPLETED',
      });
    });
  });

  it('returns 404 when the teacher does not exist', async () => {
    const response = await createSession({
      teacherId: new mongoose.Types.ObjectId().toString(),
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Teacher not found' });
  });

  it('rejects an invalid teacher ObjectId', async () => {
    const response = await createSession({ teacherId: 'not-an-object-id' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects missing required fields', async () => {
    const response = await request(app).post('/sessions').send({ teacherId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects invalid date values', async () => {
    const response = await createSession({ startTime: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects an end time earlier than the start time', async () => {
    const response = await createSession({
      startTime: '2026-11-20T11:00:00.000Z',
      endTime: '2026-11-20T10:00:00.000Z',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects an end time equal to the start time', async () => {
    const response = await createSession({
      endTime: '2026-11-20T10:00:00.000Z',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects an overlapping session for the same teacher', async () => {
    await createSession().expect(201);

    const response = await createSession({
      startTime: '2026-11-20T10:30:00.000Z',
      endTime: '2026-11-20T11:30:00.000Z',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'This teacher already has an overlapping session',
    });
  });

  it('allows non-overlapping sessions for the same teacher', async () => {
    await createSession().expect(201);

    const response = await createSession({
      startTime: '2026-11-20T11:00:00.000Z',
      endTime: '2026-11-20T12:00:00.000Z',
    });

    expect(response.status).toBe(201);
  });
});
