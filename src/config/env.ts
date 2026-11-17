import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_CLUSTER_URL: z
    .string()
    .regex(/^[A-Za-z0-9.-]+$/, 'DB_CLUSTER_URL must be a MongoDB cluster hostname')
    .refine(
      (host) => host.includes('.') && !host.startsWith('.') && !host.endsWith('.'),
      'DB_CLUSTER_URL must be a valid cluster hostname',
    ),
  DB_NAME: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const invalidVariables = [
    ...new Set(parsedEnv.error.issues.map((issue) => issue.path.join('.'))),
  ];
  throw new Error(`Invalid environment configuration: ${invalidVariables.join(', ')}`);
}

export const env = parsedEnv.data;
export type EnvironmentConfig = typeof env;
