import { z } from 'zod';

const createUserBodySchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.string().trim().min(1),
});

export const createUserSchema = z.object({
  body: createUserBodySchema,
});

export const userSessionHistorySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'id must be a valid ObjectId'),
  }),
});

export type CreateUserInput = z.infer<typeof createUserBodySchema>;
export type UserSessionHistoryParams = z.infer<typeof userSessionHistorySchema>['params'];
