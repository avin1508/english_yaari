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

export interface UserSessionHistoryItem {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  userId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSessionHistory {
  upcomingSessions: UserSessionHistoryItem[];
  completedSessions: UserSessionHistoryItem[];
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

  bookIfAvailable: async (
    sessionId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<InstanceType<typeof Session> | null> => {
    return Session.findOneAndUpdate(
      { _id: sessionId, status: SESSION_STATUS.AVAILABLE },
      { $set: { status: SESSION_STATUS.BOOKED, userId } },
      { new: true, runValidators: true },
    ).exec();
  },

  completeIfBooked: async (
    sessionId: Types.ObjectId,
    completedAt: Date,
  ): Promise<InstanceType<typeof Session> | null> => {
    return Session.findOneAndUpdate(
      { _id: sessionId, status: SESSION_STATUS.BOOKED },
      { $set: { status: SESSION_STATUS.COMPLETED, completedAt } },
      { new: true, runValidators: true },
    ).exec();
  },

  findStatusById: async (sessionId: Types.ObjectId): Promise<SessionStatus | null> => {
    const session = await Session.findById(sessionId).select('status').lean().exec();
    return session?.status ?? null;
  },

  findHistoryByUser: async (userId: Types.ObjectId): Promise<UserSessionHistory> => {
    const [history] = await Session.aggregate<UserSessionHistory>([
      { $match: { userId } },
      {
        $facet: {
          upcomingSessions: [
            { $match: { status: SESSION_STATUS.BOOKED } },
            { $sort: { startTime: 1 } },
            {
              $project: {
                _id: 1,
                teacherId: 1,
                userId: 1,
                startTime: 1,
                endTime: 1,
                status: 1,
                completedAt: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          completedSessions: [
            { $match: { status: SESSION_STATUS.COMPLETED } },
            { $sort: { startTime: 1 } },
            {
              $project: {
                _id: 1,
                teacherId: 1,
                userId: 1,
                startTime: 1,
                endTime: 1,
                status: 1,
                completedAt: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
        },
      },
    ]).exec();

    return history ?? { upcomingSessions: [], completedSessions: [] };
  },
};
