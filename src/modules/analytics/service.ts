import { ApiError } from "@/lib/errors"
import type { BusinessContext } from "@/modules/auth/session"
import { isValidVisitorId } from "@/lib/visitor"
import {
  analyticsPeriodStart,
  buildAnalyticsBuckets,
  buildCampaignPerformance,
  buildLeadStatusBreakdown,
  buildLocationBreakdown,
  buildPerformanceSeries,
  buildSummary,
} from "./helpers"
import {
  createCampaignEventRecord,
  findActiveCampaignIdBySlug,
  listAnalyticsCampaigns,
  listAnalyticsLeads,
  listPageViewEvents,
} from "./repository"
import { pageViewEventSchema } from "./schemas"
import type { AnalyticsOverview, AnalyticsQuery } from "./types"

/**
 * Analytics service (Phase 5). Metrics come from first-party landing-page
 * events (`PAGE_VIEW`) and lead records. No ad-platform impressions, clicks or
 * spend are implied or fabricated.
 */

export interface PublicEventMeta {
  ipAddress?: string
  userAgent?: string | null
}

/** One page-view beacon from a public campaign page. */
export async function recordPageView(
  campaignSlug: string,
  input: unknown,
  meta: PublicEventMeta = {},
): Promise<{ recorded: true }> {
  const data = pageViewEventSchema.parse(input)
  const campaign = await findActiveCampaignIdBySlug(campaignSlug)
  if (!campaign) throw ApiError.notFound("This campaign page is not available.")

  await createCampaignEventRecord({
    campaignId: campaign.id,
    type: "PAGE_VIEW",
    visitorId: data.visitorId,
    referrer: data.referrer ?? null,
    userAgent: meta.userAgent ?? null,
    ipAddress: meta.ipAddress ?? null,
    utmSource: data.utmSource ?? null,
    utmMedium: data.utmMedium ?? null,
    utmCampaign: data.utmCampaign ?? null,
    utmTerm: data.utmTerm ?? null,
    utmContent: data.utmContent ?? null,
  })

  return { recorded: true }
}

/**
 * Records a successful enquiry against the visitor that submitted it. Called by
 * the lead service in the same request as lead creation (after it succeeds).
 * Invalid/missing visitor ids are ignored — an untracked visit is better than a
 * fabricated one.
 */
export async function recordFormSubmitEvent(input: {
  campaignId: string
  visitorId: string | null | undefined
  referrer?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
}): Promise<void> {
  if (!input.visitorId || !isValidVisitorId(input.visitorId)) return

  await createCampaignEventRecord({
    campaignId: input.campaignId,
    type: "FORM_SUBMIT",
    visitorId: input.visitorId,
    referrer: input.referrer ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    utmTerm: input.utmTerm ?? null,
    utmContent: input.utmContent ?? null,
  })
}

/** Everything the analytics page needs, in one pass. */
export async function getAnalyticsOverview(
  context: BusinessContext,
  query: AnalyticsQuery,
): Promise<AnalyticsOverview> {
  const until = new Date()
  const since = analyticsPeriodStart(query.period, until)
  const range = { since, until, campaignId: query.campaignId }

  const [campaigns, events, leads] = await Promise.all([
    listAnalyticsCampaigns(context.businessId),
    listPageViewEvents(context.businessId, range),
    listAnalyticsLeads(context.businessId, range),
  ])

  const earliestCandidates = [events[0]?.occurredAt, leads[0]?.createdAt].filter(
    (value): value is Date => value instanceof Date,
  )
  const earliest =
    earliestCandidates.length > 0
      ? new Date(Math.min(...earliestCandidates.map((date) => date.getTime())))
      : null

  const buckets = buildAnalyticsBuckets({
    period: query.period,
    since,
    until,
    earliest,
  })

  const scopedCampaigns = query.campaignId
    ? campaigns.filter((campaign) => campaign.id === query.campaignId)
    : campaigns

  return {
    period: query.period,
    campaignId: query.campaignId,
    since,
    until,
    summary: buildSummary(events, leads),
    performance: buildPerformanceSeries(buckets, events, leads, query.period),
    campaigns: buildCampaignPerformance(scopedCampaigns, events, leads),
    locations: buildLocationBreakdown(leads),
    statuses: buildLeadStatusBreakdown(leads),
    campaignOptions: campaigns,
    hasPageViews: events.length > 0,
  }
}
