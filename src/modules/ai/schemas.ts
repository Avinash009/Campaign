import { z } from "zod"

/**
 * Input/output schemas for the AI module.
 *
 * Only the LLM-backed content features (ad copy and landing-page content) use
 * these request shapes. Lead qualification, follow-up drafts and campaign
 * reviews are deterministic rule-based features and need no provider — see
 * `lead-qualification.ts`, `follow-up.ts` and `campaign-assistant.ts`.
 *
 * Pure module: safe to import from client components.
 */

export const AI_TONES = ["professional", "friendly", "urgent"] as const
export type AiTone = (typeof AI_TONES)[number]

export const AI_TONE_LABELS: Record<AiTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  urgent: "Urgent",
}

export const aiToneSchema = z.enum(AI_TONES, { error: "Choose a valid tone." })

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value.trim() === "" ? undefined : value

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} must be at most ${max} characters.` })
    .optional()
    .transform(emptyToUndefined)

const requiredDetails = z
  .string()
  .trim()
  .min(10, { error: "Add at least 10 characters of product or service details." })
  .max(4000, { error: "Product details must be at most 4000 characters." })

const contentBase = {
  /** Industry catalog slug. The server resolves the display name. */
  industrySlug: optionalText(80, "Industry"),
  productDetails: requiredDetails,
  offerDetails: optionalText(500, "Offer details"),
  targetAudience: optionalText(300, "Target audience"),
  tone: aiToneSchema.default("professional"),
}

export const adCopyInputSchema = z.object(contentBase)
export type AdCopyInput = z.infer<typeof adCopyInputSchema>

export const landingContentInputSchema = z.object({
  ...contentBase,
  campaignName: z
    .string()
    .trim()
    .min(2, { error: "Campaign name must be at least 2 characters." })
    .max(150, { error: "Campaign name must be at most 150 characters." }),
  targetLocation: optionalText(160, "Target location"),
  priceDisplay: optionalText(80, "Price display"),
})
export type LandingContentInput = z.infer<typeof landingContentInputSchema>

/**
 * Provider response contract. The adapter asks for exactly these keys, but
 * `parsing.ts` also accepts a few common aliases before validating so a
 * slightly off-spec model response does not silently become empty output.
 */
export const generatedCopySchema = z.object({
  headlines: z.array(z.string().trim().min(1).max(160)).min(1).max(5),
  descriptions: z.array(z.string().trim().min(1).max(2000)).min(1).max(4),
  suggestedCtas: z.array(z.string().trim().min(1).max(60)).min(1).max(5),
})

export const generatedLandingContentSchema = z.object({
  headline: z.string().trim().min(1).max(160),
  promoDescription: z.string().trim().min(1).max(2000),
  productDetails: z.string().trim().max(4000).default(""),
  offerDetails: z.string().trim().max(500).default(""),
  suggestedCta: z.string().trim().max(60).default(""),
})
