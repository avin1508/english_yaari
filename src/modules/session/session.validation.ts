import { z } from 'zod';

const createSessionBodySchema = z
  .object({
    teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'teacherId must be a valid ObjectId'),
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
  })
  .refine((session) => new Date(session.endTime) > new Date(session.startTime), {
    message: 'endTime must be later than startTime',
    path: ['endTime'],
  });

export const createSessionSchema = z.object({
  body: createSessionBodySchema,
});

export type CreateSessionInput = z.infer<typeof createSessionBodySchema>;
