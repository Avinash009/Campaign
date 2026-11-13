import type { CampaignStatus, LeadStatus } from "@prisma/client"

/**
 * Analytics DTOs (Phase 5). All metrics are computed from CampaignHub's own
 * landing-page activity and lead records — never from ad-platform impressions,
 * clicks or spend.
 */

export const ANALYTICS_PERIODS = ["7d", "30d", "90d", "all"] as const
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
}

export interface AnalyticsQuery {
  period: AnalyticsPeriod
  campaignId?: string
}

export interface AnalyticsSummary {
  pageViews: number
  uniqueVisitors: number
  enquiries: number
  /** `null` when no page views were tracked, so the rate is undefined. */
  conversionRate: number | null
  qualifiedLeads: number
  convertedLeads: number
}

/** One bucket in the performance-over-time chart (daily, or monthly for all time). */
export interface PerformancePoint {
  key: string
  label: string
  pageViews: number
  visitors: number
  leads: number
}

export interface CampaignPerformanceRow {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  pageViews: number
  visitors: number
  leads: number
  conversionRate: number | null
}

export interface LocationRow {
  city: string
  leads: number
  /** Share of enquiries in the selected window, 0–100 with one decimal. */
  share: number
}

export interface LeadStatusRow {
  status: LeadStatus
  count: number
}

export interface AnalyticsCampaignOption {
  id: string
  name: string
  slug: string
  status: CampaignStatus
}

/** Minimal rows selected by the repository and aggregated in the service. */
export interface AnalyticsEventRow {
  campaignId: string
  visitorId: string
  occurredAt: Date
}

export interface AnalyticsLeadRow {
  campaignId: string | null
  city: string | null
  status: LeadStatus
  createdAt: Date
}

export interface AnalyticsOverview {
  period: AnalyticsPeriod
  campaignId?: string
  since: Date | null
  until: Date
  summary: AnalyticsSummary
  performance: PerformancePoint[]
  campaigns: CampaignPerformanceRow[]
  locations: LocationRow[]
  statuses: LeadStatusRow[]
  campaignOptions: AnalyticsCampaignOption[]
  /** False when the business has no page-view events in the window yet. */
  hasPageViews: boolean
}
