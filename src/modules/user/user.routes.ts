import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { createUserController, getUserSessionHistoryController } from './user.controller';
import { createUserSchema, userSessionHistorySchema } from './user.validation';

export const userRouter = Router();

userRouter.get(
  '/:id/sessions',
  validate(userSessionHistorySchema),
  getUserSessionHistoryController,
);
userRouter.post('/', validate(createUserSchema), createUserController);
