import express from 'express';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { apiRouter } from './routes';

export const app = express();

app.use(express.json());
app.use('/api', apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
