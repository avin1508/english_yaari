import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/modules/user/user.model';

describe('POST /users', () => {
  beforeAll(async () => {
    const databaseName = `teacher-session-booking-api-tests-${process.pid}`;
    await mongoose.connect(`mongodb://127.0.0.1:27017/${databaseName}`);
    await User.syncIndexes();
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
