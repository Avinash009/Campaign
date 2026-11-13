import { z } from "zod"
import { phoneSchema } from "@/modules/business/schemas"
import { parseFollowUpDate, startOfTodayIst } from "./helpers"

/**
 * Lead input schemas — the single source of truth for public enquiries, list
 * filters and dashboard actions. Form-facing types keep plain strings so
 * react-hook-form can use the same schemas for client-side validation.
 */

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const

export const LEAD_SOURCES = [
  "CAMPAIGN_PAGE",
  "DIRECT",
  "ORGANIC",
  "SOCIAL",
  "EMAIL",
  "REFERRAL",
  "OTHER",
] as const

export const leadStatusSchema = z.enum(LEAD_STATUSES, {
  error: "Choose a valid lead status.",
})

export const ENQUIRY_CONSENT_TEXT =
  "I agree to be contacted by this business about my enquiry. My details are shared only with them."

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

// ---------------------------------------------------------------------------
// Public enquiry form
// ---------------------------------------------------------------------------

export const leadEnquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Enter your name (at least 2 characters)." })
    .max(120, { error: "Name must be at most 120 characters." }),
  phone: phoneSchema,
  email: optionalEmail,
  city: optionalText(80, "City"),
  interestedIn: optionalText(120, "What you are interested in"),
  message: optionalText(2000, "Message"),
  consent: z
    .boolean()
    .refine((value) => value === true, { error: "Please accept the privacy notice to continue." }),
  /** Honeypot: real visitors never see or fill this field. */
  website: z.string().trim().max(200).optional().or(z.literal("")),
  utmSource: optionalText(120, "UTM source"),
  utmMedium: optionalText(120, "UTM medium"),
  utmCampaign: optionalText(160, "UTM campaign"),
  utmTerm: optionalText(160, "UTM term"),
  utmContent: optionalText(160, "UTM content"),
  referrer: optionalText(500, "Referrer"),
})

export type LeadEnquiryInput = z.infer<typeof leadEnquirySchema>
/** Form-facing shape: plain strings before optional transforms run. */
export type LeadEnquiryFormValues = z.input<typeof leadEnquirySchema>

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------

export const LEAD_LIST_PAGE_SIZES = [10, 20, 50] as const

const optionalDateQuery = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use a YYYY-MM-DD date." })
  .optional()
  .or(z.literal(""))
  .transform(emptyToUndefined)

export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: leadStatusSchema.optional(),
  campaignId: z
    .string()
    .trim()
    .max(64, { error: "Campaign filter is invalid." })
    .optional()
    .transform(emptyToUndefined),
  /** "me", "unassigned" or a teammate's user id. Members are always scoped to themselves. */
  assignedTo: z
    .string()
    .trim()
    .max(64, { error: "Assignee filter is invalid." })
    .optional()
    .transform(emptyToUndefined),
  search: z
    .string()
    .trim()
    .max(100, { error: "Search is too long." })
    .optional()
    .transform(emptyToUndefined),
  from: optionalDateQuery,
  to: optionalDateQuery,
})

export type LeadListQuery = z.infer<typeof leadListQuerySchema>

/** Normalizes URL search params; invalid values fall back to defaults. */
export function parseLeadListQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): LeadListQuery {
  const raw =
    input instanceof URLSearchParams
      ? {
          page: input.get("page") ?? undefined,
          pageSize: input.get("pageSize") ?? undefined,
          status: input.get("status") ?? undefined,
          campaignId: input.get("campaignId") ?? undefined,
          assignedTo: input.get("assignedTo") ?? undefined,
          search: input.get("search") ?? undefined,
          from: input.get("from") ?? undefined,
          to: input.get("to") ?? undefined,
        }
      : input
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const candidate = {
    page: first(raw.page),
    pageSize: first(raw.pageSize),
    status: first(raw.status),
    campaignId: first(raw.campaignId),
    assignedTo: first(raw.assignedTo),
    search: first(raw.search),
    from: first(raw.from),
    to: first(raw.to),
  }

  const parsed = leadListQuerySchema.safeParse(candidate)
  if (parsed.success) return parsed.data
  return leadListQuerySchema.parse({})
}

/** Serialises the active filters back into a query string (for links). */
export function leadFiltersToSearchParams(
  query: LeadListQuery,
  options: { includePage?: boolean } = {},
): URLSearchParams {
  const params = new URLSearchParams()
  if (options.includePage && query.page > 1) params.set("page", String(query.page))
  if (options.includePage && query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize))
  }
  if (query.status) params.set("status", query.status)
  if (query.campaignId) params.set("campaignId", query.campaignId)
  if (query.assignedTo) params.set("assignedTo", query.assignedTo)
  if (query.search) params.set("search", query.search)
  if (query.from) params.set("from", query.from)
  if (query.to) params.set("to", query.to)
  return params
}

// ---------------------------------------------------------------------------
// Dashboard actions
// ---------------------------------------------------------------------------

export const leadStatusUpdateSchema = z.object({
  status: leadStatusSchema,
  note: optionalText(1000, "Note"),
})

export type LeadStatusUpdateInput = z.infer<typeof leadStatusUpdateSchema>

export const leadAssignSchema = z.object({
  userId: z
    .union([
      z.string().trim().min(1, { error: "Choose a team member." }),
      z.literal(""),
      z.null(),
    ])
    .transform((value) => (value === "" || value === null ? null : value)),
})

export type LeadAssignInput = z.infer<typeof leadAssignSchema>

export const leadNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, { error: "Write a note before saving." })
    .max(2000, { error: "Note must be at most 2,000 characters." }),
})

export type LeadNoteInput = z.infer<typeof leadNoteSchema>

export const leadFollowUpScheduleSchema = z
  .object({
    scheduledFor: z
      .string()
      .trim()
      .min(1, { error: "Choose a follow-up date." })
      .refine((value) => parseFollowUpDate(value) !== null, {
        error: "Enter a valid follow-up date.",
      })
      .transform((value) => parseFollowUpDate(value) as Date),
    note: optionalText(1000, "Note"),
  })
  .refine(
    (value) => {
      if (!(value.scheduledFor instanceof Date)) return true
      return value.scheduledFor.getTime() >= startOfTodayIst().getTime()
    },
    { error: "Choose today or a future date.", path: ["scheduledFor"] },
  )

export type LeadFollowUpScheduleInput = z.infer<typeof leadFollowUpScheduleSchema>

export const leadFollowUpCompleteSchema = z.object({
  note: optionalText(1000, "Note"),
})

export type LeadFollowUpCompleteInput = z.infer<typeof leadFollowUpCompleteSchema>
