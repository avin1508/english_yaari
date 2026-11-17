import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { createSessionController, getAvailableSessionsController } from './session.controller';
import { availableSessionsSchema, createSessionSchema } from './session.validation';

export const sessionRouter = Router();

sessionRouter.get('/available', validate(availableSessionsSchema), getAvailableSessionsController);
sessionRouter.post('/', validate(createSessionSchema), createSessionController);
