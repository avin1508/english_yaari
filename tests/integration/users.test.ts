import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../src/app';
import { SESSION_STATUS } from '../../src/constants/sessionStatus';
import { Session } from '../../src/modules/session/session.model';
import { Teacher } from '../../src/modules/teacher/teacher.model';
import { User } from '../../src/modules/user/user.model';

describe('POST /users', () => {
  beforeAll(async () => {
    const databaseName = `teacher-session-booking-api-tests-${process.pid}`;
    await mongoose.connect(`mongodb://127.0.0.1:27017/${databaseName}`);
    await Promise.all([User.syncIndexes(), Session.syncIndexes(), Teacher.syncIndexes()]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('creates a user and normalizes their email', async () => {
    const response = await request(app).post('/users').send({
      fullName: 'Avinash Kumar',
      email: ' AVINASH@GMAIL.COM ',
      phone: '9876543210',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      message: 'User created successfully',
      data: {
        fullName: 'Avinash Kumar',
        email: 'avinash@gmail.com',
        phone: '9876543210',
      },
    });
    expect(response.body.data._id).toBeDefined();
    expect(response.body.data.createdAt).toBeDefined();
  });

  it('rejects missing required fields', async () => {
    const response = await request(app).post('/users').send({
      fullName: 'Avinash Kumar',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Request validation failed',
    });
  });

  describe('GET /users/:id/sessions', () => {
    let userId: string;
    let anotherUserId: string;
    let teacherId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      await Promise.all([User.deleteMany({}), Session.deleteMany({}), Teacher.deleteMany({})]);

      const [user, anotherUser, teacher] = await Promise.all([
        User.create({
          fullName: 'Session History User',
          email: 'session-history@example.com',
          phone: '1234567890',
        }),
        User.create({
          fullName: 'Another User',
          email: 'another-session-history@example.com',
          phone: '0987654321',
        }),
        Teacher.create({
          fullName: 'History Teacher',
          email: 'history-teacher@example.com',
          specialization: 'Mathematics',
          experience: 6,
        }),
      ]);

      userId = user.id;
      anotherUserId = anotherUser.id;
      teacherId = teacher._id;
    });

    const createSession = async (
      sessionUserId: string,
      status: 'AVAILABLE' | 'BOOKED' | 'COMPLETED',
      startTime: string,
    ): Promise<void> => {
      await Session.create({
        teacherId,
        userId: status === 'AVAILABLE' ? null : new mongoose.Types.ObjectId(sessionUserId),
        startTime: new Date(startTime),
        endTime: new Date(new Date(startTime).getTime() + 60 * 60 * 1000),
        status,
        completedAt: status === 'COMPLETED' ? new Date(startTime) : null,
      });
    };

    it('returns booked and completed sessions grouped for the user', async () => {
      await createSession(userId, SESSION_STATUS.BOOKED, '2026-11-20T10:00:00.000Z');
      await createSession(userId, SESSION_STATUS.BOOKED, '2026-11-21T10:00:00.000Z');
      await createSession(userId, SESSION_STATUS.COMPLETED, '2026-11-18T10:00:00.000Z');
      await createSession(userId, SESSION_STATUS.COMPLETED, '2026-11-19T10:00:00.000Z');
      await createSession(userId, SESSION_STATUS.AVAILABLE, '2026-11-22T10:00:00.000Z');
      await createSession(anotherUserId, SESSION_STATUS.BOOKED, '2026-11-23T10:00:00.000Z');

      const response = await request(app).get(`/users/${userId}/sessions`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'User sessions fetched successfully',
        data: {
          upcomingSessions: [{ status: SESSION_STATUS.BOOKED }, { status: SESSION_STATUS.BOOKED }],
          completedSessions: [
            { status: SESSION_STATUS.COMPLETED },
            { status: SESSION_STATUS.COMPLETED },
          ],
        },
      });
      expect(response.body.data.upcomingSessions).toHaveLength(2);
      expect(response.body.data.completedSessions).toHaveLength(2);
      expect(
        [...response.body.data.upcomingSessions, ...response.body.data.completedSessions].every(
          (session: { userId: string }) => session.userId === userId,
        ),
      ).toBe(true);
      expect(
        [...response.body.data.upcomingSessions, ...response.body.data.completedSessions].some(
          (session: { status: string }) => session.status === SESSION_STATUS.AVAILABLE,
        ),
      ).toBe(false);
    });

    it('rejects an invalid user ID', async () => {
      const response = await request(app).get('/users/not-an-object-id/sessions');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 when the user does not exist', async () => {
      const response = await request(app).get(
        `/users/${new mongoose.Types.ObjectId().toString()}/sessions`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ success: false, message: 'User not found' });
    });

    it('returns empty groups when the user has no sessions', async () => {
      const response = await request(app).get(`/users/${userId}/sessions`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        upcomingSessions: [],
        completedSessions: [],
      });
    });

    it('executes the session aggregation pipeline with a facet', async () => {
      const aggregateSpy = jest.spyOn(Session, 'aggregate');

      try {
        await request(app).get(`/users/${userId}/sessions`).expect(200);

        expect(aggregateSpy).toHaveBeenCalledTimes(1);
        const pipeline = aggregateSpy.mock.calls[0][0];
        expect(pipeline[0]).toEqual({ $match: { userId: expect.any(mongoose.Types.ObjectId) } });
        expect(pipeline[1]).toHaveProperty('$facet.upcomingSessions');
        expect(pipeline[1]).toHaveProperty('$facet.completedSessions');
      } finally {
        aggregateSpy.mockRestore();
      }
    });
  });

  it('rejects invalid email addresses', async () => {
    const response = await request(app).post('/users').send({
      fullName: 'Avinash Kumar',
      email: 'not-an-email',
      phone: '9876543210',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects duplicate email addresses with HTTP 409', async () => {
    const user = {
      fullName: 'Avinash Kumar',
      email: 'avinash@gmail.com',
      phone: '9876543210',
    };

    await request(app).post('/users').send(user).expect(201);
    const response = await request(app)
      .post('/users')
      .send({ ...user, email: ' AVINASH@GMAIL.COM ' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'A user with this email already exists',
    });
  });

  it('rejects an empty request body', async () => {
    const response = await request(app).post('/users').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
