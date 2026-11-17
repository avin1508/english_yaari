import { model, Schema } from 'mongoose';
import type { ITeacher } from './teacher.interface';

const teacherSchema = new Schema<ITeacher>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    specialization: { type: String, required: true },
    experience: { type: Number, required: true },
  },
  { timestamps: true },
);

export const Teacher = model<ITeacher>('Teacher', teacherSchema);
