import { describe, expect, it } from "vitest"
import {
  analyticsFiltersToSearchParams,
  pageViewEventSchema,
  parseAnalyticsQuery,
} from "./schemas"

describe("parseAnalyticsQuery", () => {
  it("defaults to 30 days and keeps a valid campaign filter", () => {
    expect(parseAnalyticsQuery({})).toEqual({ period: "30d" })
    expect(parseAnalyticsQuery({ period: "90d", campaignId: "campaign-1" })).toEqual({
      period: "90d",
      campaignId: "campaign-1",
    })
  })

  it("reads URLSearchParams and takes the first value of repeated params", () => {
    expect(parseAnalyticsQuery(new URLSearchParams("?period=7d&campaignId=abc"))).toEqual({
      period: "7d",
      campaignId: "abc",
    })
    expect(parseAnalyticsQuery({ period: ["all", "7d"] })).toEqual({ period: "all" })
  })

  it("falls back to 30 days for unknown periods and drops blank filters", () => {
    expect(parseAnalyticsQuery({ period: "week" })).toEqual({ period: "30d" })
    expect(parseAnalyticsQuery({ period: "7d", campaignId: "  " })).toEqual({ period: "7d" })
  })

  it("drops the whole query when a filter is malformed", () => {
    expect(parseAnalyticsQuery({ period: "90d", campaignId: "x".repeat(65) })).toEqual({
      period: "30d",
    })
  })
})

describe("analyticsFiltersToSearchParams", () => {
  it("omits the default period so links stay short", () => {
    expect(analyticsFiltersToSearchParams({ period: "30d" }).toString()).toBe("")
  })

  it("keeps non-default periods and campaign filters", () => {
    expect(
      analyticsFiltersToSearchParams({ period: "7d", campaignId: "campaign-1" }).toString(),
    ).toBe("period=7d&campaignId=campaign-1")
  })
})

describe("pageViewEventSchema", () => {
  const visitorId = "8f14e45f-ceea-4e7a-9c2a-1b2c3d4e5f60"

  it("accepts page views and normalizes the event type", () => {
    expect(pageViewEventSchema.parse({ type: "page_view", visitorId })).toMatchObject({
      type: "PAGE_VIEW",
      visitorId,
    })
    expect(pageViewEventSchema.parse({ type: "PAGE_VIEW", visitorId }).type).toBe("PAGE_VIEW")
  })

  it("trims optional UTM values and turns blanks into undefined", () => {
    const parsed = pageViewEventSchema.parse({
      type: "page_view",
      visitorId: ` ${visitorId} `,
      utmSource: " whatsapp ",
      utmMedium: "   ",
      referrer: "",
    })

    expect(parsed.visitorId).toBe(visitorId)
    expect(parsed.utmSource).toBe("whatsapp")
    expect(parsed.utmMedium).toBeUndefined()
    expect(parsed.referrer).toBeUndefined()
  })

  it("rejects other event types, short ids and unsafe characters", () => {
    expect(() =>
      pageViewEventSchema.parse({ type: "FORM_SUBMIT", visitorId }),
    ).toThrow()
    expect(() =>
      pageViewEventSchema.parse({ type: "page_view", visitorId: "short" }),
    ).toThrow()
    expect(() =>
      pageViewEventSchema.parse({ type: "page_view", visitorId: "bad id with spaces" }),
    ).toThrow()
  })

  it("accepts opaque ids up to 64 characters", () => {
    expect(() =>
      pageViewEventSchema.parse({ type: "page_view", visitorId: "a".repeat(64) }),
    ).not.toThrow()
    expect(() =>
      pageViewEventSchema.parse({ type: "page_view", visitorId: "a".repeat(65) }),
    ).toThrow()
  })
})
