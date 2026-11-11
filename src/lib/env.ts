import { z } from "zod"

/**
 * Environment configuration — validated once, fails fast with clear messages.
 * Secrets live only in env files (`.env` is untracked; `.env.example` documents
 * every variable). Never import this from client components.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ error: "DATABASE_URL must be a valid PostgreSQL connection string" }),
  AUTH_SECRET: z
    .string()
    .min(32, { error: "AUTH_SECRET must be at least 32 characters (generate with: openssl rand -base64 32)" }),
  APP_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Storage
  STORAGE_DRIVER: z.enum(["local", "gcs"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("public/uploads"),
  GCS_BUCKET_NAME: z.string().optional(),

  // Email
  EMAIL_DRIVER: z.enum(["console"]).default("console"),

  // Bootstrap admin (seed script)
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Demo tenant (seed script)
  DEMO_OWNER_EMAIL: z.email().default("owner@srigeenrealty.test"),
  DEMO_OWNER_PASSWORD: z.string().min(8).optional(),
  DEMO_MEMBER_EMAIL: z.email().default("member@srigeenrealty.test"),
  DEMO_MEMBER_PASSWORD: z.string().min(8).optional(),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ")
    throw new Error(`Invalid environment configuration — ${issues}`)
  }
  cached = parsed.data
  return cached
}
