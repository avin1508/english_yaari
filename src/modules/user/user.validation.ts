import { z } from 'zod';

const createUserBodySchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.string().trim().min(1),
});

export const createUserSchema = z.object({
  body: createUserBodySchema,
});

export type CreateUserInput = z.infer<typeof createUserBodySchema>;
