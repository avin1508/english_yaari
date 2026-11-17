import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { createSessionController } from './session.controller';
import { createSessionSchema } from './session.validation';

export const sessionRouter = Router();

sessionRouter.post('/', validate(createSessionSchema), createSessionController);
