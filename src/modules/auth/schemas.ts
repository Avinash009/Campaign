import { z } from "zod"

/** Login input for the credentials provider and the /login form (Phase 2). */
export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Enter your password." }),
})
export type LoginInput = z.infer<typeof loginSchema>

/**
 * Password policy for new accounts: 8+ characters, at least one letter and
 * one number. Shared by registration (Phase 2) and the bootstrap admin seed.
 */
export const passwordPolicy = z
  .string()
  .min(8, { error: "Password must be at least 8 characters long." })
  .regex(/[A-Za-z]/, { error: "Password must contain at least one letter." })
  .regex(/[0-9]/, { error: "Password must contain at least one number." })

/** Owner registration (Phase 2 endpoint will consume this). */
export const registerSchema = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters." }).max(100),
  email: z.email({ error: "Enter a valid email address." }),
  password: passwordPolicy,
})
export type RegisterInput = z.infer<typeof registerSchema>
