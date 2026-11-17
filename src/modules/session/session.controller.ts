import type { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { sessionService } from './session.service';
import type { CreateSessionInput } from './session.validation';

export const createSessionController = asyncHandler(
  async (request: Request, response: Response): Promise<void> => {
    const session = await sessionService.createSession(request.body as CreateSessionInput);
    response.status(201).json(new ApiResponse(session, 'Session created successfully'));
  },
);
