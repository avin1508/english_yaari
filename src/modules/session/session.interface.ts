import type { Types } from 'mongoose';
import type { SessionStatus } from '../../constants/sessionStatus';

export interface ISession {
  teacherId: Types.ObjectId;
  userId: Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
  completedAt: Date | null;
}
