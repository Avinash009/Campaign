import { z } from "zod"
import { campaignStatusSchema } from "@/modules/campaigns/schemas"

/**
 * Platform-admin input schemas (Phase 6). These are cross-tenant operations, so
 * every service that consumes them is named `*Platform*` and is only reachable
 * through `requirePlatformAdmin()` / `requireApiPlatformAdmin()`.
 *
 * Written to keep the *input* shape plain strings (form friendly): rupee
 * amounts are entered in rupees and converted to integer paise, and feature
 * lists arrive as newline/comma separated text.
 */

export const PLATFORM_BUSINESS_STATUSES = ["ACTIVE", "SUSPENDED"] as const

export const businessStatusSchema = z.enum(PLATFORM_BUSINESS_STATUSES, {
  error: "Choose a valid business status.",
})

export const businessStatusUpdateSchema = z.object({ status: businessStatusSchema })

export type BusinessStatusUpdateInput = z.infer<typeof businessStatusUpdateSchema>

export const PLAN_INTERVALS = ["MONTHLY", "YEARLY"] as const
export const planIntervalSchema = z.enum(PLAN_INTERVALS, {
  error: "Choose a valid billing interval.",
})

/** Page sizes offered by the admin tables. */
export const ADMIN_LIST_PAGE_SIZES = [10, 20, 50] as const

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value.trim() === "" ? undefined : value

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} must be at most ${max} characters.` })
    .optional()
    .transform(emptyToUndefined)

const requiredText = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, { error: `${label} must be at least ${min} characters.` })
    .max(max, { error: `${label} must be at most ${max} characters.` })

const optionalSlug = z
  .string()
  .trim()
  .max(80, { error: "Slug must be at most 80 characters." })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error: "Use lowercase letters, numbers and single hyphens only.",
  })
  .optional()
  .or(z.literal(""))
  .transform(emptyToUndefined)

/** Blank means "no limit" for plan caps. */
const optionalCount = (max: number, label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{0,5}$/, { error: `Enter a whole number for the ${label}, or leave it blank.` })
    .optional()
    .transform((value) => (value === undefined || value === "" ? undefined : Number(value)))
    .refine((value) => value === undefined || (value >= 0 && value <= max), {
      error: `The ${label} must be between 0 and ${max}.`,
    })

const optionalIconKey = z
  .string()
  .trim()
  .max(40, { error: "Icon key is too long." })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error: "Use lowercase letters, numbers and hyphens for the icon key.",
  })
  .optional()
  .or(z.literal(""))
  .transform(emptyToUndefined)

const sortOrderField = z
  .number()
  .int({ error: "Sort order must be a whole number." })
  .min(0, { error: "Sort order cannot be negative." })
  .max(999, { error: "Sort order must be 999 or less." })

/** Whole rupees as typed by the admin → integer paise. */
export function parseRupeesToPaise(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === "") return undefined
  const rupees = Number(trimmed)
  if (!Number.isFinite(rupees) || rupees < 0) return undefined
  return Math.round(rupees * 100)
}

const amountRupeesField = z
  .string()
  .trim()
  .regex(/^\d{1,9}$/, { error: "Enter the price in whole rupees, e.g. 999." })
  .transform((value) => parseRupeesToPaise(value) ?? 0)

/** Newline/comma separated feature text → clean list (max 12, each ≤120 chars). */
export function splitFeatureList(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined
  const features = value
    .split(/[\n,]+/)
    .map((feature) => feature.trim())
    .filter(Boolean)
  return [...new Set(features)].slice(0, 12).map((feature) => feature.slice(0, 120))
}

const featuresTextField = z
  .string()
  .trim()
  .max(2000, { error: "Features must be at most 2000 characters." })
  .optional()

// ---------------------------------------------------------------------------
// List queries (URL search params)
// ---------------------------------------------------------------------------

const listSearchField = z
  .string()
  .trim()
  .max(100, { error: "Search is too long." })
  .optional()
  .transform(emptyToUndefined)

export const adminBusinessListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: businessStatusSchema.optional(),
  search: listSearchField,
})

export type AdminBusinessListQuery = z.infer<typeof adminBusinessListQuerySchema>

export const adminCampaignListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: campaignStatusSchema.optional(),
  search: listSearchField,
})

export type AdminCampaignListQuery = z.infer<typeof adminCampaignListQuerySchema>

type RawQuery = Record<string, string | string[] | undefined> | URLSearchParams

function readParams(input: RawQuery, keys: readonly string[]): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const key of keys) {
    if (input instanceof URLSearchParams) {
      result[key] = input.get(key) ?? undefined
    } else {
      const value = input[key]
      result[key] = Array.isArray(value) ? value[0] : value
    }
  }
  return result
}

const BUSINESS_QUERY_KEYS = ["page", "pageSize", "status", "search"] as const
const CAMPAIGN_QUERY_KEYS = ["page", "pageSize", "status", "search"] as const

/** Normalizes URL params; malformed filters fall back to the defaults. */
export function parseAdminBusinessListQuery(input: RawQuery): AdminBusinessListQuery {
  const parsed = adminBusinessListQuerySchema.safeParse(readParams(input, BUSINESS_QUERY_KEYS))
  return parsed.success ? parsed.data : adminBusinessListQuerySchema.parse({})
}

export function parseAdminCampaignListQuery(input: RawQuery): AdminCampaignListQuery {
  const parsed = adminCampaignListQuerySchema.safeParse(readParams(input, CAMPAIGN_QUERY_KEYS))
  return parsed.success ? parsed.data : adminCampaignListQuerySchema.parse({})
}

// ---------------------------------------------------------------------------
// Industry management
// ---------------------------------------------------------------------------

const industryBase = z.object({
  name: requiredText(2, 80, "Industry name"),
  slug: optionalSlug,
  description: optionalText(300, "Description"),
  iconKey: optionalIconKey,
  sortOrder: sortOrderField,
  isActive: z.boolean(),
})

export const industryCreateSchema = industryBase

const industryUpdateObject = z.object({
  name: requiredText(2, 80, "Industry name").optional(),
  slug: optionalSlug,
  description: optionalText(300, "Description"),
  iconKey: optionalIconKey,
  sortOrder: sortOrderField.optional(),
  isActive: z.boolean().optional(),
})

export const industryUpdateSchema = industryUpdateObject.refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  { error: "Nothing to update." },
)

export type IndustryCreateInput = z.infer<typeof industryCreateSchema>
export type IndustryUpdateInput = z.infer<typeof industryUpdateSchema>

export const industryInputSchema = industryCreateSchema
export type IndustryInput = IndustryCreateInput
/** Form-facing shape (no transforms), used with react-hook-form. */
export const industryFormSchema = industryBase
export type IndustryFormValues = z.input<typeof industryFormSchema>

// ---------------------------------------------------------------------------
// Subscription plan management
// ---------------------------------------------------------------------------

const planBase = z.object({
  name: requiredText(2, 100, "Plan name"),
  slug: optionalSlug,
  description: optionalText(500, "Description"),
  amountRupees: amountRupeesField,
  interval: planIntervalSchema,
  campaignLimit: optionalCount(1000, "campaign limit"),
  memberLimit: optionalCount(1000, "team member limit"),
  featuresText: featuresTextField,
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  sortOrder: sortOrderField,
})

export const planCreateSchema = planBase.transform(({ amountRupees, featuresText, ...rest }) => ({
  ...rest,
  amountInPaise: amountRupees,
  features: splitFeatureList(featuresText) ?? [],
}))

const planUpdateObject = z.object({
  name: requiredText(2, 100, "Plan name").optional(),
  slug: optionalSlug,
  description: optionalText(500, "Description"),
  amountRupees: amountRupeesField.optional(),
  interval: planIntervalSchema.optional(),
  campaignLimit: optionalCount(1000, "campaign limit"),
  memberLimit: optionalCount(1000, "team member limit"),
  featuresText: featuresTextField,
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: sortOrderField.optional(),
})

export const planUpdateSchema = planUpdateObject
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: "Nothing to update.",
  })
  .transform(({ amountRupees, featuresText, ...rest }) => ({
    ...rest,
    ...(amountRupees !== undefined ? { amountInPaise: amountRupees } : {}),
    ...(featuresText !== undefined ? { features: splitFeatureList(featuresText) ?? [] } : {}),
  }))

export type PlanCreateInput = z.infer<typeof planCreateSchema>
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>

export const planInputSchema = planCreateSchema
export type PlanInput = PlanCreateInput

/**
 * Form-facing plan schema (validation only, no value transforms). The admin
 * form sends these raw strings/booleans to the API, which re-validates and
 * converts rupees → paise and feature text → an array.
 */
export const planFormSchema = z.object({
  name: requiredText(2, 100, "Plan name"),
  slug: optionalSlug,
  description: optionalText(500, "Description"),
  amountRupees: z
    .string()
    .trim()
    .regex(/^\d{1,9}$/, { error: "Enter the price in whole rupees, e.g. 999." }),
  interval: planIntervalSchema,
  campaignLimit: z
    .string()
    .trim()
    .regex(/^\d{0,5}$/, { error: "Enter a whole number for the campaign limit, or leave it blank." })
    .optional(),
  memberLimit: z
    .string()
    .trim()
    .regex(/^\d{0,5}$/, { error: "Enter a whole number for the team member limit, or leave it blank." })
    .optional(),
  featuresText: featuresTextField,
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  sortOrder: sortOrderField,
})

export type PlanFormValues = z.input<typeof planFormSchema>
