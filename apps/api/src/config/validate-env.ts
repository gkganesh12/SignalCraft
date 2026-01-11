import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_JWT_PUBLIC_KEY: z.string().optional(),
  CLERK_ISSUER: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_WEBHOOK_SECRET: z.string().optional(),
  GROUPING_WINDOW_MINUTES: z.coerce.number().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_DEFAULT_CHANNEL: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>) => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(`Environment validation error: ${JSON.stringify(errors)}`);
  }
  return parsed.data;
};
