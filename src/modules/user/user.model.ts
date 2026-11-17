import { model, Schema } from 'mongoose';
import type { IUser } from './user.interface';

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);
