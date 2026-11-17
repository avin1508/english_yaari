import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

const getParserErrorStatus = (error: unknown): 400 | 413 | undefined => {
  if (typeof error !== 'object' || error === null || !('type' in error)) {
    return undefined;
  }

  if (error.type === 'entity.parse.failed') {
    return 400;
  }

  if (error.type === 'entity.too.large') {
    return 413;
  }

  return undefined;
};

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

  const parserErrorStatus = getParserErrorStatus(error);
  if (parserErrorStatus !== undefined) {
    response.status(parserErrorStatus).json({
      success: false,
      message: parserErrorStatus === 413 ? 'Request body too large' : 'Invalid JSON request body',
    });
    return;
  }

  console.error('Unhandled request error:', error instanceof Error ? error.name : 'UnknownError');
  response.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
