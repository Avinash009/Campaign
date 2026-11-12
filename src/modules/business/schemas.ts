import { z } from "zod"

/**
 * Business input schemas — the single source of truth for onboarding, profile
 * updates and team invitations. Consumed by services (server-side validation)
 * and by the forms (client-side validation), so the transforms are written to
 * keep the *input* type plain strings (react-hook-form friendly).
 */

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value.trim() === "" ? undefined : value

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} must be at most ${max} characters.` })
    .optional()
    .transform(emptyToUndefined)

export const phoneSchema = z
  .string()
  .trim()
  .min(7, { error: "Enter a valid phone number." })
  .max(20, { error: "Phone number is too long." })
  .regex(/^\+?[0-9][0-9\s-]{5,18}$/, {
    error: "Enter a valid phone number (digits, spaces or hyphens; + country code optional).",
  })

const optionalWebsite = z
  .string()
  .trim()
  .url({ error: "Enter a valid website URL, including https://." })
  .max(200, { error: "Website URL is too long." })
  .optional()
  .or(z.literal(""))
  .transform(emptyToUndefined)

export const onboardingSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, { error: "Business name must be at least 2 characters." })
    .max(120, { error: "Business name must be at most 120 characters." }),
  businessEmail: z.email({ error: "Enter a valid business email address." }).max(200),
  phone: phoneSchema,
  industrySlug: z.string().trim().min(1, { error: "Choose your industry." }),
  website: optionalWebsite,
  city: optionalText(80, "City"),
  state: optionalText(80, "State"),
  description: optionalText(1000, "Description"),
  logoUrl: optionalText(500, "Logo URL"),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
/** Form-facing shape: same fields, before optional transforms run. */
export type OnboardingFormValues = z.input<typeof onboardingSchema>

/** Profile edits: every field optional, but at least one must be present. */
export const profileUpdateSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, { error: "Business name must be at least 2 characters." })
      .max(120, { error: "Business name must be at most 120 characters." })
      .optional()
      .transform(emptyToUndefined),
    businessEmail: z
      .email({ error: "Enter a valid business email address." })
      .max(200)
      .optional()
      .or(z.literal(""))
      .transform(emptyToUndefined),
    phone: phoneSchema.optional().or(z.literal("")).transform(emptyToUndefined),
    industrySlug: z.string().trim().optional().transform(emptyToUndefined),
    website: optionalWebsite,
    city: optionalText(80, "City"),
    state: optionalText(80, "State"),
    description: optionalText(1000, "Description"),
    logoUrl: optionalText(500, "Logo URL"),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: "Nothing to update.",
  })

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ProfileUpdateFormValues = z.input<typeof profileUpdateSchema>

export const inviteMemberSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).max(200),
  role: z.enum(["ADMIN", "MEMBER"], { error: "Choose a role for the invitee." }),
})

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const acceptInviteSchema = z.object({
  token: z
    .string()
    .trim()
    .min(20, { error: "This invitation link is not valid." })
    .max(200, { error: "This invitation link is not valid." }),
})

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
