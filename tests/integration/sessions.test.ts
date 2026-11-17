import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../src/app';
import { Session } from '../../src/modules/session/session.model';
import { Teacher } from '../../src/modules/teacher/teacher.model';

describe('POST /sessions', () => {
  let teacherId: string;

  beforeAll(async () => {
    const databaseName = `teacher-session-booking-session-tests-${process.pid}`;
    await mongoose.connect(`mongodb://127.0.0.1:27017/${databaseName}`);
    await Promise.all([Session.syncIndexes(), Teacher.syncIndexes()]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

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
