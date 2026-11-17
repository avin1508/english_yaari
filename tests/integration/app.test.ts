import express from 'express';
import request from 'supertest';
import { app } from '../../src/app';
import { errorMiddleware } from '../../src/middlewares/error.middleware';

describe('application foundation', () => {
  it('sets baseline security headers and hides Express identification', async () => {
    const response = await request(app).get('/not-a-route');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('returns a safe 400 response for malformed JSON', async () => {
    const response = await request(app)
      .post('/users')
      .set('Content-Type', 'application/json')
      .send('{"fullName":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid JSON request body',
    });
  });

  it('rejects JSON request bodies larger than the configured limit', async () => {
    const response = await request(app)
      .post('/users')
      .send({ payload: 'x'.repeat(101 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      success: false,
      message: 'Request body too large',
    });
  });

  it('does not expose unexpected error details in HTTP responses', async () => {
    const isolatedApp = express();
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    isolatedApp.get('/error', (): never => {
      throw new Error('sensitive internal details');
    });
    isolatedApp.use(errorMiddleware);

    try {
      const response = await request(isolatedApp).get('/error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error',
      });
      expect(JSON.stringify(response.body)).not.toContain('sensitive internal details');
      expect(errorLog).toHaveBeenCalledWith('Unhandled request error:', 'Error');
    } finally {
      errorLog.mockRestore();
    }
  });

  it('returns a centralized 404 response for an unknown route', async () => {
    const response = await request(app).get('/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });
});
