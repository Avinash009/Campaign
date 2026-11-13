import { describe, expect, it } from "vitest"
import {
  analyticsPeriodStart,
  bucketKeyFor,
  buildAnalyticsBuckets,
  buildCampaignPerformance,
  buildLeadStatusBreakdown,
  buildLocationBreakdown,
  buildPerformanceSeries,
  buildSummary,
  conversionRate,
  istDateKey,
  istMonthKey,
  parseAnalyticsPeriod,
  percentage,
} from "./helpers"
import type {
  AnalyticsCampaignOption,
  AnalyticsEventRow,
  AnalyticsLeadRow,
} from "./types"

const NOW = new Date("2026-11-13T10:00:00+05:30")

function iso(value: Date): string {
  return value.toISOString()
}

describe("parseAnalyticsPeriod", () => {
  it("accepts known presets and falls back to 30 days", () => {
    expect(parseAnalyticsPeriod("7d")).toBe("7d")
    expect(parseAnalyticsPeriod(["90d", "7d"])).toBe("90d")
    expect(parseAnalyticsPeriod("all")).toBe("all")
    expect(parseAnalyticsPeriod("week")).toBe("30d")
    expect(parseAnalyticsPeriod(undefined)).toBe("30d")
  })
})

describe("analyticsPeriodStart", () => {
  it("uses whole IST calendar days including today", () => {
    expect(iso(analyticsPeriodStart("7d", NOW) as Date)).toBe("2026-11-06T18:30:00.000Z")
    expect(iso(analyticsPeriodStart("30d", NOW) as Date)).toBe("2026-10-14T18:30:00.000Z")
    expect(iso(analyticsPeriodStart("90d", NOW) as Date)).toBe("2026-08-15T18:30:00.000Z")
  })

  it("returns null for all time", () => {
    expect(analyticsPeriodStart("all", NOW)).toBeNull()
  })
})

describe("IST keys", () => {
  it("rolls over to the next date at IST midnight, not UTC midnight", () => {
    expect(istDateKey(new Date("2026-11-12T18:29:59.999Z"))).toBe("2026-11-12")
    expect(istDateKey(new Date("2026-11-12T18:30:00.000Z"))).toBe("2026-11-13")
    expect(istMonthKey(new Date("2026-10-31T20:00:00.000Z"))).toBe("2026-11")
    expect(bucketKeyFor("all", new Date("2026-10-31T20:00:00.000Z"))).toBe("2026-11")
  })
})

describe("buildAnalyticsBuckets", () => {
  it("builds one dense daily bucket per day of a preset", () => {
    const buckets = buildAnalyticsBuckets({
      period: "7d",
      since: analyticsPeriodStart("7d", NOW),
      until: NOW,
      earliest: null,
    })

    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
    ])
    expect(iso(buckets[0].start)).toBe("2026-11-06T18:30:00.000Z")
    expect(iso(buckets[0].end)).toBe("2026-11-07T18:30:00.000Z")
  })

  it("builds monthly buckets for all time, from the earliest activity", () => {
    const buckets = buildAnalyticsBuckets({
      period: "all",
      since: null,
      until: NOW,
      earliest: new Date("2026-09-15T10:00:00+05:30"),
    })

    expect(buckets.map((bucket) => bucket.key)).toEqual(["2026-09", "2026-10", "2026-11"])
    expect(iso(buckets[2].start)).toBe("2026-10-31T18:30:00.000Z")
  })

  it("falls back to the current month when there is no history", () => {
    const buckets = buildAnalyticsBuckets({
      period: "all",
      since: null,
      until: NOW,
      earliest: null,
    })

    expect(buckets).toHaveLength(1)
    expect(buckets[0].key).toBe("2026-11")
  })
})

describe("conversionRate", () => {
  it("is leads ÷ unique visitors as a percentage with one decimal", () => {
    expect(conversionRate(1, 8)).toBe(12.5)
    expect(conversionRate(6, 12)).toBe(50)
    expect(conversionRate(2, 3)).toBe(66.7)
  })

  it("is null without tracked visitors and is not capped at 100", () => {
    expect(conversionRate(4, 0)).toBeNull()
    expect(conversionRate(3, 1)).toBe(300)
  })
})

describe("percentage", () => {
  it("shares a total with one decimal and handles an empty total", () => {
    expect(percentage(1, 3)).toBe(33.3)
    expect(percentage(2, 2)).toBe(100)
    expect(percentage(1, 0)).toBe(0)
  })
})

describe("buildSummary", () => {
  const visitor = "11111111-1111-1111-1111-111111111111"
  const otherVisitor = "22222222-2222-2222-2222-222222222222"
  const events: AnalyticsEventRow[] = [
    { campaignId: "a", visitorId: visitor, occurredAt: NOW },
    { campaignId: "a", visitorId: visitor, occurredAt: NOW },
    { campaignId: "b", visitorId: otherVisitor, occurredAt: NOW },
  ]
  const leads: AnalyticsLeadRow[] = [
    { campaignId: "a", city: "Pune", status: "QUALIFIED", createdAt: NOW },
    { campaignId: "a", city: "Pune", status: "CONVERTED", createdAt: NOW },
  ]

  it("counts views, distinct visitors and leads", () => {
    expect(buildSummary(events, leads)).toEqual({
      pageViews: 3,
      uniqueVisitors: 2,
      enquiries: 2,
      conversionRate: 100,
      qualifiedLeads: 1,
      convertedLeads: 1,
    })
  })
})

describe("buildPerformanceSeries", () => {
  it("places events and leads in their IST day and dedupes visitors per bucket", () => {
    const buckets = buildAnalyticsBuckets({
      period: "7d",
      since: analyticsPeriodStart("7d", NOW),
      until: NOW,
      earliest: null,
    })
    const visitorA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    const visitorB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

    const points = buildPerformanceSeries(
      buckets,
      [
        { campaignId: "a", visitorId: visitorA, occurredAt: new Date("2026-11-12T09:00:00+05:30") },
        { campaignId: "a", visitorId: visitorA, occurredAt: new Date("2026-11-12T18:00:00+05:30") },
        { campaignId: "a", visitorId: visitorB, occurredAt: new Date("2026-11-12T23:00:00+05:30") },
        { campaignId: "a", visitorId: visitorA, occurredAt: new Date("2026-11-13T00:30:00+05:30") },
      ],
      [
        { campaignId: "a", city: "Pune", status: "NEW", createdAt: new Date("2026-11-12T12:00:00+05:30") },
        { campaignId: "b", city: "Pune", status: "NEW", createdAt: new Date("2026-11-13T11:00:00+05:30") },
      ],
      "7d",
    )

    expect(points).toHaveLength(7)
    const twelfth = points.find((point) => point.key === "2026-11-12")
    expect(twelfth).toMatchObject({ pageViews: 3, visitors: 2, leads: 1 })
    const thirteenth = points.find((point) => point.key === "2026-11-13")
    expect(thirteenth).toMatchObject({ pageViews: 1, visitors: 1, leads: 1 })
    expect(points.find((point) => point.key === "2026-11-11")).toMatchObject({
      pageViews: 0,
      visitors: 0,
      leads: 0,
    })
  })
})

describe("buildCampaignPerformance", () => {
  const campaigns: AnalyticsCampaignOption[] = [
    { id: "a", name: "Alpha", slug: "alpha", status: "ACTIVE" },
    { id: "b", name: "Beta", slug: "beta", status: "DRAFT" },
    { id: "c", name: "Gamma", slug: "gamma", status: "ACTIVE" },
  ]
  const visitor = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

  it("aggregates per campaign, sorts by leads and keeps empty campaigns", () => {
    const rows = buildCampaignPerformance(
      campaigns,
      [
        { campaignId: "a", visitorId: visitor, occurredAt: NOW },
        { campaignId: "a", visitorId: visitor, occurredAt: NOW },
        { campaignId: "b", visitorId: visitor, occurredAt: NOW },
      ],
      [
        { campaignId: "b", city: null, status: "NEW", createdAt: NOW },
        { campaignId: "b", city: null, status: "NEW", createdAt: NOW },
      ],
    )

    expect(rows.map((row) => row.name)).toEqual(["Beta", "Alpha", "Gamma"])
    expect(rows[0]).toMatchObject({ pageViews: 1, visitors: 1, leads: 2, conversionRate: 200 })
    expect(rows[1]).toMatchObject({ pageViews: 2, visitors: 1, leads: 0, conversionRate: 0 })
    expect(rows[2]).toMatchObject({ pageViews: 0, visitors: 0, leads: 0, conversionRate: null })
  })
})

describe("buildLocationBreakdown", () => {
  it("groups cities, folds missing cities into Not shared and sorts by count", () => {
    const leads: AnalyticsLeadRow[] = [
      { campaignId: "a", city: "Mumbai", status: "NEW", createdAt: NOW },
      { campaignId: "a", city: "Mumbai", status: "NEW", createdAt: NOW },
      { campaignId: "a", city: "Pune", status: "NEW", createdAt: NOW },
      { campaignId: "a", city: null, status: "NEW", createdAt: NOW },
      { campaignId: "a", city: "   ", status: "NEW", createdAt: NOW },
    ]

    const rows = buildLocationBreakdown(leads)
    expect(rows[0]).toMatchObject({ city: "Mumbai", leads: 2, share: 40 })
    expect(rows).toEqual(
      expect.arrayContaining([
        { city: "Pune", leads: 1, share: 20 },
        { city: "Not shared", leads: 2, share: 40 },
      ]),
    )
    expect(rows).toHaveLength(3)
  })
})

describe("buildLeadStatusBreakdown", () => {
  it("always returns the full pipeline in order", () => {
    const rows = buildLeadStatusBreakdown([
      { campaignId: "a", city: null, status: "NEW", createdAt: NOW },
      { campaignId: "a", city: null, status: "NEW", createdAt: NOW },
      { campaignId: "a", city: null, status: "CONVERTED", createdAt: NOW },
    ])

    expect(rows.map((row) => row.status)).toEqual([
      "NEW",
      "CONTACTED",
      "INTERESTED",
      "QUALIFIED",
      "CONVERTED",
      "LOST",
    ])
    expect(rows.find((row) => row.status === "NEW")?.count).toBe(2)
    expect(rows.find((row) => row.status === "CONVERTED")?.count).toBe(1)
    expect(rows.find((row) => row.status === "LOST")?.count).toBe(0)
  })
})
