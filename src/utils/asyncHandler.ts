import type { Request, RequestHandler, Response, NextFunction } from 'express';

type AsyncController = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler = (controller: AsyncController): RequestHandler => {
  return (request, response, next): void => {
    void controller(request, response, next).catch(next);
  };
};
