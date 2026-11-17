import { Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { sessionRepository } from './session.repository';
import { userRepository } from '../user/user.repository';
import type {
  AvailableSessionsQuery,
  BookSessionInput,
  CreateSessionInput,
} from './session.validation';

export const sessionService = {
  bookSession: async (
    sessionId: string,
    input: BookSessionInput['body'],
  ): Promise<NonNullable<Awaited<ReturnType<typeof sessionRepository.bookIfAvailable>>>> => {
    const objectId = new Types.ObjectId(sessionId);
    const userId = new Types.ObjectId(input.userId);

    if (!(await userRepository.existsById(userId))) {
      throw new ApiError(404, 'User not found');
    }

    const bookedSession = await sessionRepository.bookIfAvailable(objectId, userId);
    if (bookedSession !== null) {
      return bookedSession;
    }

    const currentStatus = await sessionRepository.findStatusById(objectId);
    if (currentStatus === null) {
      throw new ApiError(404, 'Session not found');
    }

    throw new ApiError(409, `Session cannot be booked because it is ${currentStatus}`);
  },

  completeSession: async (
    sessionId: string,
  ): Promise<NonNullable<Awaited<ReturnType<typeof sessionRepository.completeIfBooked>>>> => {
    const objectId = new Types.ObjectId(sessionId);
    const session = await sessionRepository.completeIfBooked(objectId, new Date());

    if (session !== null) {
      return session;
    }

    const currentStatus = await sessionRepository.findStatusById(objectId);
    if (currentStatus === null) {
      throw new ApiError(404, 'Session not found');
    }

    throw new ApiError(409, `Session cannot be completed because it is ${currentStatus}`);
  },

  getAvailableSessions: async (
    query: AvailableSessionsQuery,
  ): Promise<Awaited<ReturnType<typeof sessionRepository.findAvailableByDate>>> => {
    const timestampDate = new Date(query.dateTimestamp);
    const startOfDay = new Date(
      Date.UTC(
        timestampDate.getUTCFullYear(),
        timestampDate.getUTCMonth(),
        timestampDate.getUTCDate(),
      ),
    );
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    return sessionRepository.findAvailableByDate(startOfDay, endOfDay);
  },

  createSession: async (
    input: CreateSessionInput,
  ): Promise<Awaited<ReturnType<typeof sessionRepository.create>>> => {
    const teacherId = new Types.ObjectId(input.teacherId);
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    if (!(await sessionRepository.teacherExists(teacherId))) {
      throw new ApiError(404, 'Teacher not found');
    }

    if (await sessionRepository.hasOverlappingSession(teacherId, startTime, endTime)) {
      throw new ApiError(409, 'This teacher already has an overlapping session');
    }

    return sessionRepository.create(input);
  },
};
