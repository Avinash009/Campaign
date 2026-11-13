import { z } from "zod"
import { isValidVisitorId } from "@/lib/visitor"
import { ANALYTICS_PERIODS, type AnalyticsQuery } from "./types"

/** URL/query parsing and the public page-view beacon contract. */

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export const analyticsQuerySchema = z.object({
  period: z.enum(ANALYTICS_PERIODS).default("30d"),
  campaignId: z
    .string()
    .trim()
    .max(64, { error: "Campaign filter is invalid." })
    .optional()
    .transform(emptyToUndefined),
})

/**
 * Normalizes the analytics URL params. Unknown periods fall back to 30 days
 * and a malformed campaign id is dropped rather than breaking the page.
 */
export function parseAnalyticsQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): AnalyticsQuery {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const raw =
    input instanceof URLSearchParams
      ? {
          period: input.get("period") ?? undefined,
          campaignId: input.get("campaignId") ?? undefined,
        }
      : input

  const parsed = analyticsQuerySchema.safeParse({
    period: first(raw.period),
    campaignId: first(raw.campaignId),
  })

  if (parsed.success) return parsed.data
  return { period: "30d" }
}

/** Keeps the default period out of the URL so links stay short. */
export function analyticsFiltersToSearchParams(query: AnalyticsQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.period !== "30d") params.set("period", query.period)
  if (query.campaignId) params.set("campaignId", query.campaignId)
  return params
}

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined))
}

/**
 * Beacon body. Only page views are accepted from the browser: form submissions
 * are recorded by the server in the same transaction as the lead, so they
 * cannot be faked by a client.
 */
export const pageViewEventSchema = z.object({
  type: z.enum(["page_view", "PAGE_VIEW"]).transform(() => "PAGE_VIEW" as const),
  visitorId: z
    .string()
    .trim()
    .min(8, { error: "Invalid visitor id." })
    .max(64, { error: "Invalid visitor id." })
    .refine(isValidVisitorId, { error: "Invalid visitor id." }),
  referrer: optionalText(500),
  utmSource: optionalText(160),
  utmMedium: optionalText(160),
  utmCampaign: optionalText(160),
  utmTerm: optionalText(160),
  utmContent: optionalText(160),
})

export type PageViewEventInput = z.infer<typeof pageViewEventSchema>
