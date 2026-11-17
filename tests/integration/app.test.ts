import request from 'supertest';
import { app } from '../../src/app';

describe('application foundation', () => {
  it('returns a centralized 404 response for an unknown route', async () => {
    const response = await request(app).get('/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});
