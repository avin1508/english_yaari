import type { Types } from 'mongoose';
import { SESSION_STATUS } from '../../constants/sessionStatus';
import { Session } from './session.model';
import type { CreateSessionInput } from './session.validation';
import { Teacher } from '../teacher/teacher.model';
import type { SessionStatus } from '../../constants/sessionStatus';

export interface AvailableSession {
  _id: Types.ObjectId;
  teacher: {
    _id: Types.ObjectId;
    fullName: string;
    specialization: string;
    experience: number;
  };
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
}

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

  findAvailableByDate: async (startOfDay: Date, endOfDay: Date): Promise<AvailableSession[]> => {
    return Session.aggregate<AvailableSession>([
      {
        $match: {
          status: SESSION_STATUS.AVAILABLE,
          startTime: { $gte: startOfDay, $lt: endOfDay },
        },
      },
      { $sort: { startTime: 1 } },
      {
        $lookup: {
          from: Teacher.collection.name,
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      { $unwind: '$teacher' },
      {
        $project: {
          _id: 1,
          teacher: {
            _id: '$teacher._id',
            fullName: '$teacher.fullName',
            specialization: '$teacher.specialization',
            experience: '$teacher.experience',
          },
          startTime: 1,
          endTime: 1,
          status: 1,
        },
      },
    ]).exec();
  },
};
