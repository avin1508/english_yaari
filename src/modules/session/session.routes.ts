import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import {
  bookSessionController,
  completeSessionController,
  createSessionController,
  getAvailableSessionsController,
} from './session.controller';
import {
  availableSessionsSchema,
  bookSessionSchema,
  completeSessionSchema,
  createSessionSchema,
} from './session.validation';

export const sessionRouter = Router();

sessionRouter.get('/available', validate(availableSessionsSchema), getAvailableSessionsController);
sessionRouter.post('/:id/book', validate(bookSessionSchema), bookSessionController);
sessionRouter.patch('/:id/complete', validate(completeSessionSchema), completeSessionController);
sessionRouter.post('/', validate(createSessionSchema), createSessionController);
