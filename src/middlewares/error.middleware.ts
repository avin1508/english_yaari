import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const errorMiddleware: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
