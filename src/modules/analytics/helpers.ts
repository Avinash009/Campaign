import type { LeadStatus } from "@prisma/client"
import {
  ANALYTICS_PERIODS,
  type AnalyticsCampaignOption,
  type AnalyticsEventRow,
  type AnalyticsLeadRow,
  type AnalyticsPeriod,
  type AnalyticsSummary,
  type CampaignPerformanceRow,
  type LeadStatusRow,
  type LocationRow,
  type PerformancePoint,
} from "./types"

/**
 * Pure analytics helpers: period windows, dense chart buckets, conversion math
 * and aggregation. Kept free of Prisma and `Date.now` defaults so tests can pin
 * "now" and component render stays deterministic.
 */

const DAY_MS = 24 * 60 * 60 * 1000
/** India has no daylight saving, so a fixed offset is safe and explicit. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
]

export interface BucketWindow {
  key: string
  label: string
  /** Inclusive start of the bucket (UTC instant). */
  start: Date
  /** Exclusive end of the bucket (UTC instant). */
  end: Date
}

export function parseAnalyticsPeriod(value: string | string[] | undefined): AnalyticsPeriod {
  const candidate = Array.isArray(value) ? value[0] : value
  const match = ANALYTICS_PERIODS.find((period) => period === candidate)
  return match ?? "30d"
}

/** IST midnight for the supplied instant. */
function startOfIstDay(date: Date): Date {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - IST_OFFSET_MS)
}

/** `YYYY-MM-DD` in IST. */
export function istDateKey(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/** `YYYY-MM` in IST. */
export function istMonthKey(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 7)
}

function istDayStart(key: string): Date {
  return new Date(`${key}T00:00:00.000+05:30`)
}

function istMonthStart(key: string): Date {
  return new Date(`${key}-01T00:00:00.000+05:30`)
}

function nextDayKey(key: string): string {
  const date = new Date(`${key}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function nextMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number)
  // Month is 1-based, so this rolls over correctly (2026-12 → 2027-01).
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7)
}

export function formatDayLabel(key: string): string {
  return istDayStart(key).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  })
}

export function formatMonthLabel(key: string): string {
  return istMonthStart(key).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
}

/**
 * Start of the selected window. Presets are whole IST calendar days, so a
 * 7-day chart always contains seven complete buckets including today.
 */
export function analyticsPeriodStart(
  period: AnalyticsPeriod,
  now: Date = new Date(),
): Date | null {
  if (period === "all") return null
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
  return startOfIstDay(new Date(now.getTime() - (days - 1) * DAY_MS))
}

/**
 * Dense buckets for the chart: daily for presets, monthly for all time. Empty
 * days/months are included so the x-axis has no gaps.
 */
export function buildAnalyticsBuckets(input: {
  period: AnalyticsPeriod
  since: Date | null
  until: Date
  earliest: Date | null
}): BucketWindow[] {
  const monthly = input.period === "all"
  const first = input.since ?? input.earliest ?? input.until
  const buckets: BucketWindow[] = []

  if (monthly) {
    let key = istMonthKey(first)
    const lastKey = istMonthKey(input.until)
    // Guard against pathological ranges; 120 months is ten years of history.
    for (let i = 0; i < 120; i += 1) {
      const next = nextMonthKey(key)
      buckets.push({
        key,
        label: formatMonthLabel(key),
        start: istMonthStart(key),
        end: istMonthStart(next),
      })
      if (key === lastKey) break
      key = next
    }
    return buckets
  }

  let key = istDateKey(first)
  const lastKey = istDateKey(input.until)
  // Presets are ≤ 90 days; the guard only protects against bad input.
  for (let i = 0; i < 400; i += 1) {
    const next = nextDayKey(key)
    buckets.push({
      key,
      label: formatDayLabel(key),
      start: istDayStart(key),
      end: istDayStart(next),
    })
    if (key === lastKey) break
    key = next
  }
  return buckets
}

/** Chart bucket for an event/lead timestamp. */
export function bucketKeyFor(period: AnalyticsPeriod, date: Date): string {
  return period === "all" ? istMonthKey(date) : istDateKey(date)
}

/** Conversion rate as `(leads / unique visitors) × 100`, one decimal. */
export function conversionRate(leads: number, visitors: number): number | null {
  if (visitors <= 0) return null
  return Math.round((leads / visitors) * 1000) / 10
}

/** Share of a total, one decimal, 0 when the total is empty. */
export function percentage(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

export function buildSummary(
  events: AnalyticsEventRow[],
  leads: AnalyticsLeadRow[],
): AnalyticsSummary {
  const uniqueVisitors = new Set(events.map((event) => event.visitorId)).size
  const enquiries = leads.length
  return {
    pageViews: events.length,
    uniqueVisitors,
    enquiries,
    conversionRate: conversionRate(enquiries, uniqueVisitors),
    qualifiedLeads: leads.filter((lead) => lead.status === "QUALIFIED").length,
    convertedLeads: leads.filter((lead) => lead.status === "CONVERTED").length,
  }
}

export function buildPerformanceSeries(
  buckets: BucketWindow[],
  events: AnalyticsEventRow[],
  leads: AnalyticsLeadRow[],
  period: AnalyticsPeriod,
): PerformancePoint[] {
  const points: PerformancePoint[] = buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    pageViews: 0,
    visitors: 0,
    leads: 0,
  }))
  const visitorSets = buckets.map(() => new Set<string>())
  const index = new Map(buckets.map((bucket, position) => [bucket.key, position]))

  for (const event of events) {
    const position = index.get(bucketKeyFor(period, event.occurredAt))
    if (position === undefined) continue
    points[position].pageViews += 1
    visitorSets[position].add(event.visitorId)
  }

  for (const lead of leads) {
    const position = index.get(bucketKeyFor(period, lead.createdAt))
    if (position === undefined) continue
    points[position].leads += 1
  }

  points.forEach((point, position) => {
    point.visitors = visitorSets[position].size
  })
  return points
}

export function buildCampaignPerformance(
  campaigns: AnalyticsCampaignOption[],
  events: AnalyticsEventRow[],
  leads: AnalyticsLeadRow[],
): CampaignPerformanceRow[] {
  const rows = new Map<
    string,
    { row: CampaignPerformanceRow; visitors: Set<string> }
  >()

  for (const campaign of campaigns) {
    rows.set(campaign.id, {
      row: {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        status: campaign.status,
        pageViews: 0,
        visitors: 0,
        leads: 0,
        conversionRate: null,
      },
      visitors: new Set<string>(),
    })
  }

  for (const event of events) {
    const entry = rows.get(event.campaignId)
    if (!entry) continue
    entry.row.pageViews += 1
    entry.visitors.add(event.visitorId)
  }

  for (const lead of leads) {
    if (!lead.campaignId) continue
    const entry = rows.get(lead.campaignId)
    if (entry) entry.row.leads += 1
  }

  const result = Array.from(rows.values()).map(({ row, visitors }) => ({
    ...row,
    visitors: visitors.size,
    conversionRate: conversionRate(row.leads, visitors.size),
  }))

  return result.sort(
    (a, b) => b.leads - a.leads || b.pageViews - a.pageViews || a.name.localeCompare(b.name),
  )
}

export function buildLocationBreakdown(leads: AnalyticsLeadRow[]): LocationRow[] {
  const counts = new Map<string, number>()
  for (const lead of leads) {
    const city = lead.city?.trim() || "Not shared"
    counts.set(city, (counts.get(city) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([city, count]) => ({
      city,
      leads: count,
      share: percentage(count, leads.length),
    }))
    .sort((a, b) => b.leads - a.leads || a.city.localeCompare(b.city))
}

export function buildLeadStatusBreakdown(leads: AnalyticsLeadRow[]): LeadStatusRow[] {
  return LEAD_STATUS_ORDER.map((status) => ({
    status,
    count: leads.filter((lead) => lead.status === status).length,
  }))
}
