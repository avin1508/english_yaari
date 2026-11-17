import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { env } from '../src/config/env';
import { Teacher } from '../src/modules/teacher/teacher.model';

const teachers = [
  {
    fullName: 'Ananya Sharma',
    email: 'ananya.sharma@example.com',
    specialization: 'Mathematics',
    experience: 8,
  },
  {
    fullName: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    specialization: 'Physics',
    experience: 6,
  },
  {
    fullName: 'Priya Nair',
    email: 'priya.nair@example.com',
    specialization: 'English',
    experience: 10,
  },
];

const seedTeachers = async (): Promise<void> => {
  await connectDatabase(env.MONGODB_URI);

  try {
    for (const teacher of teachers) {
      await Teacher.updateOne(
        { email: teacher.email },
        { $setOnInsert: teacher },
        { upsert: true },
      );
    }

    console.info(`Seeded ${teachers.length} teachers (existing records were left unchanged).`);
  } finally {
    await disconnectDatabase();
  }
};

void seedTeachers().catch((error: unknown) => {
  console.error('Failed to seed teachers:', error);
  process.exitCode = 1;
});
