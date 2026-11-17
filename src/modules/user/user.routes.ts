import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { createUserController } from './user.controller';
import { createUserSchema } from './user.validation';

export const userRouter = Router();

userRouter.post('/', validate(createUserSchema), createUserController);
