import { z } from "zod"
import { phoneSchema } from "@/modules/business/schemas"

/**
 * Campaign input schemas — the single source of truth for campaign create/update
 * payloads and the creation form. Written to keep the *input* type plain
 * strings (react-hook-form friendly); prices are entered in rupees and the
 * parsed output converts them to integer paise (never floats) for storage.
 */

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const

export const CAMPAIGN_OBJECTIVES = [
  "AWARENESS",
  "LEAD_GENERATION",
  "SALES",
  "APPOINTMENT_BOOKING",
  "PROMOTION",
] as const

export const CTA_TYPES = [
  "ENQUIRE_NOW",
  "CONTACT_US",
  "BOOK_APPOINTMENT",
  "REQUEST_CALLBACK",
  "GET_QUOTE",
  "SCHEDULE_VISIT",
] as const

export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES, {
  error: "Choose a valid campaign status.",
})
export const campaignObjectiveSchema = z.enum(CAMPAIGN_OBJECTIVES, {
  error: "Choose a valid campaign objective.",
})
export const ctaTypeSchema = z.enum(CTA_TYPES, { error: "Choose a valid call to action." })

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value.trim() === "" ? undefined : value

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} must be at most ${max} characters.` })
    .optional()
    .transform(emptyToUndefined)

const optionalEmail = z
  .string()
  .trim()
  .email({ error: "Enter a valid email address." })
  .max(200, { error: "Email address is too long." })
  .optional()
  .or(z.literal(""))
  .transform(emptyToUndefined)

const optionalPhone = phoneSchema.optional().or(z.literal("")).transform(emptyToUndefined)

const optionalUrl = z
  .string()
  .trim()
  .max(300, { error: "URL is too long." })
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
    error: "Enter a valid URL, including https://.",
  })
  .optional()
  .transform(emptyToUndefined)

/** `<input type="date">` value (`YYYY-MM-DD`) → UTC midnight Date. */
const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
    { error: "Enter a valid date." },
  )
  .optional()
  .transform((value) =>
    value === undefined || value === "" ? undefined : new Date(`${value}T00:00:00.000Z`),
  )

/** Rupees as typed by the user → integer paise. */
const optionalPriceRupees = z
  .string()
  .trim()
  .regex(/^\d{0,12}(\.\d{1,2})?$/, {
    error: "Enter a price in rupees, e.g. 850000 or 850000.50.",
  })
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") return undefined
    return Math.round(Number(value) * 100)
  })

const optionalAge = z
  .string()
  .trim()
  .regex(/^\d{0,3}$/, { error: "Enter an age between 13 and 100." })
  .optional()
  .transform((value) => (value === undefined || value === "" ? undefined : Number(value)))
  .refine((value) => value === undefined || (value >= 13 && value <= 100), {
    error: "Enter an age between 13 and 100.",
  })

const campaignFields = z.object({
  // Basic
  name: z
    .string()
    .trim()
    .min(2, { error: "Campaign name must be at least 2 characters." })
    .max(150, { error: "Campaign name must be at most 150 characters." }),
  description: optionalText(2000, "Description"),
  industrySlug: optionalText(80, "Industry"),
  objective: campaignObjectiveSchema.default("LEAD_GENERATION"),
  startDate: optionalDate,
  endDate: optionalDate,

  // Promotional
  headline: optionalText(160, "Headline"),
  promoDescription: optionalText(2000, "Promotional description"),
  productDetails: optionalText(4000, "Product details"),
  offerDetails: optionalText(500, "Offer details"),
  priceRupees: optionalPriceRupees,
  priceDisplay: optionalText(80, "Price display"),
  ctaType: ctaTypeSchema.default("ENQUIRE_NOW"),
  videoUrl: optionalUrl,
  contactName: optionalText(120, "Contact name"),
  contactPhone: optionalPhone,
  contactEmail: optionalEmail,

  // Targeting
  targetLocation: optionalText(160, "Target location"),
  targetAudience: optionalText(300, "Target audience"),
  ageRangeMin: optionalAge,
  ageRangeMax: optionalAge,
  /** Comma-separated interest tags from the form; parsed to `interests`. */
  interestsText: optionalText(300, "Interests"),
})

export const campaignInputSchema = campaignFields
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.endDate.getTime() >= value.startDate.getTime(),
    { error: "End date must be on or after the start date.", path: ["endDate"] },
  )
  .refine(
    (value) =>
      value.ageRangeMin === undefined ||
      value.ageRangeMax === undefined ||
      value.ageRangeMax >= value.ageRangeMin,
    { error: "Maximum age must be at least the minimum age.", path: ["ageRangeMax"] },
  )
  .transform(({ priceRupees, interestsText, ...rest }) => ({
    ...rest,
    priceInPaise: priceRupees,
    interests: (interestsText ?? "")
      .split(",")
      .map((interest) => interest.trim())
      .filter(Boolean)
      .slice(0, 10),
  }))

export type CampaignInput = z.infer<typeof campaignInputSchema>
/** Form-facing shape: strings before transforms run. */
export type CampaignFormValues = z.input<typeof campaignInputSchema>

export const campaignStatusUpdateSchema = z.object({
  status: campaignStatusSchema,
})

export type CampaignStatusUpdateInput = z.infer<typeof campaignStatusUpdateSchema>

export const CAMPAIGN_LIST_PAGE_SIZES = [10, 20, 50] as const

export const campaignListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: campaignStatusSchema.optional(),
  search: z
    .string()
    .trim()
    .max(100, { error: "Search is too long." })
    .optional()
    .transform(emptyToUndefined),
})

export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>

/** Normalizes URL search params; invalid values fall back to defaults. */
export function parseCampaignListQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): CampaignListQuery {
  const raw =
    input instanceof URLSearchParams
      ? {
          page: input.get("page") ?? undefined,
          pageSize: input.get("pageSize") ?? undefined,
          status: input.get("status") ?? undefined,
          search: input.get("search") ?? undefined,
        }
      : input
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const candidate = {
    page: first(raw.page),
    pageSize: first(raw.pageSize),
    status: first(raw.status),
    search: first(raw.search),
  }

  const parsed = campaignListQuerySchema.safeParse(candidate)
  if (parsed.success) return parsed.data
  return campaignListQuerySchema.parse({})
}
