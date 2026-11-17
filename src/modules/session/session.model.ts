import { model, Schema } from 'mongoose';
import { SESSION_STATUS } from '../../constants/sessionStatus';
import type { ISession } from './session.interface';

const sessionSchema = new Schema<ISession>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator(this: ISession, endTime: Date): boolean {
          return !this.startTime || endTime > this.startTime;
        },
        message: 'endTime must be later than startTime',
      },
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.AVAILABLE,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

sessionSchema.index({ status: 1, startTime: 1 });
sessionSchema.index({ userId: 1, status: 1, startTime: 1 });
sessionSchema.index({ teacherId: 1, startTime: 1 });

export const Session = model<ISession>('Session', sessionSchema);
