import type { Types } from 'mongoose';
import { Session } from './session.model';
import type { CreateSessionInput } from './session.validation';
import { Teacher } from '../teacher/teacher.model';

export const sessionRepository = {
  teacherExists: async (teacherId: Types.ObjectId): Promise<boolean> => {
    const teacher = await Teacher.exists({ _id: teacherId });
    return teacher !== null;
  },

  hasOverlappingSession: async (
    teacherId: Types.ObjectId,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> => {
    const session = await Session.exists({
      teacherId,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });
    return session !== null;
  },

  create: async (input: CreateSessionInput): Promise<InstanceType<typeof Session>> => {
    return Session.create({
      teacherId: input.teacherId,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
    });
  },
};
