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

const dateTimestampSchema = z
  .string()
  .regex(/^-?\d+$/, 'dateTimestamp must be a numeric Unix timestamp in milliseconds')
  .transform(Number)
  .refine(Number.isSafeInteger, 'dateTimestamp must be a safe integer')
  .refine((timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const nextUtcMidnight = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
    );
    return !Number.isNaN(nextUtcMidnight);
  }, 'dateTimestamp must represent a valid UTC date');

export const availableSessionsSchema = z.object({
  query: z.object({
    dateTimestamp: dateTimestampSchema,
  }),
});

export type CreateSessionInput = z.infer<typeof createSessionBodySchema>;
export type AvailableSessionsQuery = z.infer<typeof availableSessionsSchema>['query'];
