import { Router } from 'express';
import { sessionRouter } from '../modules/session/session.routes';
import { userRouter } from '../modules/user/user.routes';

export const apiRouter = Router();

apiRouter.use('/users', userRouter);
apiRouter.use('/sessions', sessionRouter);
