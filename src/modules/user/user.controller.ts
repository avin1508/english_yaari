import type { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { userService } from './user.service';
import type { CreateUserInput, UserSessionHistoryParams } from './user.validation';

export const getUserSessionHistoryController = asyncHandler(
  async (_request: Request, response: Response): Promise<void> => {
    const validated = response.locals.validated as { params: UserSessionHistoryParams };
    const history = await userService.getSessionHistory(validated.params);
    response.status(200).json(new ApiResponse(history, 'User sessions fetched successfully'));
  },
);

export const createUserController = asyncHandler(
  async (request: Request, response: Response): Promise<void> => {
    const user = await userService.createUser(request.body as CreateUserInput);
    response.status(201).json(new ApiResponse(user, 'User created successfully'));
  },
);
