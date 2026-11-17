import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

export const validate = (schema: ZodType): RequestHandler => {
  return (request, response, next): void => {
    const result = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query,
    });

    if (!result.success) {
      next(new ApiError(400, 'Request validation failed'));
      return;
    }

    if (typeof result.data === 'object' && result.data !== null && 'body' in result.data) {
      request.body = result.data.body;
    }

    response.locals.validated = result.data;
    next();
  };
};
