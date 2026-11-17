import { Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { sessionRepository } from './session.repository';
import type { CreateSessionInput } from './session.validation';

export const sessionService = {
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
