import type { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { userService } from './user.service';
import type { CreateUserInput } from './user.validation';

export const createUserController = asyncHandler(
  async (request: Request, response: Response): Promise<void> => {
    const user = await userService.createUser(request.body as CreateUserInput);
    response.status(201).json(new ApiResponse(user, 'User created successfully'));
  },
);
