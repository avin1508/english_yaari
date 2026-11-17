import type { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { sessionService } from './session.service';
import type {
  AvailableSessionsQuery,
  BookSessionInput,
  CompleteSessionInput,
  CreateSessionInput,
} from './session.validation';

export const completeSessionController = asyncHandler(
  async (_request: Request, response: Response): Promise<void> => {
    const validated = response.locals.validated as CompleteSessionInput;
    const session = await sessionService.completeSession(validated.params.id);
    response.status(200).json(new ApiResponse(session, 'Session completed successfully'));
  },
);

export const bookSessionController = asyncHandler(
  async (_request: Request, response: Response): Promise<void> => {
    const validated = response.locals.validated as BookSessionInput;
    const session = await sessionService.bookSession(validated.params.id, validated.body);
    response.status(200).json(new ApiResponse(session, 'Session booked successfully'));
  },
);

export const getAvailableSessionsController = asyncHandler(
  async (_request: Request, response: Response): Promise<void> => {
    const validated = response.locals.validated as { query: AvailableSessionsQuery };
    const sessions = await sessionService.getAvailableSessions(validated.query);
    response.status(200).json(new ApiResponse(sessions, 'Available sessions fetched successfully'));
  },
);

export const createSessionController = asyncHandler(
  async (request: Request, response: Response): Promise<void> => {
    const session = await sessionService.createSession(request.body as CreateSessionInput);
    response.status(201).json(new ApiResponse(session, 'Session created successfully'));
  },
);
