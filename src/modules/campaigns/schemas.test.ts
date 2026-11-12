import { describe, expect, it } from "vitest"
import {
  campaignInputSchema,
  campaignListQuerySchema,
  parseCampaignListQuery,
} from "./schemas"

const validCampaign = {
  name: "Luxury apartments in Hyderabad",
  description: "",
  industrySlug: "real-estate",
  objective: "LEAD_GENERATION",
  startDate: "",
  endDate: "",
  headline: "Signature 2 & 3 BHK apartments",
  promoDescription: "Gated community homes in Kondapur.",
  productDetails: "",
  offerDetails: "",
  priceRupees: "",
  priceDisplay: "",
  ctaType: "ENQUIRE_NOW",
  videoUrl: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  targetLocation: "",
  targetAudience: "",
  ageRangeMin: "",
  ageRangeMax: "",
  interestsText: "",
} as const

describe("campaignInputSchema", () => {
  it("accepts the minimum fields and applies defaults", () => {
    const parsed = campaignInputSchema.parse({ name: "Weekend site visit drive" })
    expect(parsed.name).toBe("Weekend site visit drive")
    expect(parsed.objective).toBe("LEAD_GENERATION")
    expect(parsed.ctaType).toBe("ENQUIRE_NOW")
    expect(parsed.priceInPaise).toBeUndefined()
    expect(parsed.interests).toEqual([])
  })

  it("trims text and converts blank optional fields to undefined", () => {
    const parsed = campaignInputSchema.parse({
      ...validCampaign,
      name: "  Luxury apartments in Hyderabad  ",
      description: "   ",
      industrySlug: "",
      videoUrl: "",
    })
    expect(parsed.name).toBe("Luxury apartments in Hyderabad")
    expect(parsed.description).toBeUndefined()
    expect(parsed.industrySlug).toBeUndefined()
    expect(parsed.videoUrl).toBeUndefined()
  })

  it("converts rupees to integer paise", () => {
    expect(campaignInputSchema.parse({ ...validCampaign, priceRupees: "850000" }).priceInPaise).toBe(
      85_000_000,
    )
    expect(campaignInputSchema.parse({ ...validCampaign, priceRupees: "999.99" }).priceInPaise).toBe(
      99_999,
    )
    expect(
      campaignInputSchema.parse({ ...validCampaign, priceRupees: "" }).priceInPaise,
    ).toBeUndefined()
  })

  it("rejects malformed prices", () => {
    for (const priceRupees of ["850000.999", "1,00,000", "-500", "abc"]) {
      expect(campaignInputSchema.safeParse({ ...validCampaign, priceRupees }).success).toBe(false)
    }
  })

  it("parses comma-separated interests, trimming blanks and keeping ten", () => {
    const parsed = campaignInputSchema.parse({
      ...validCampaign,
      interestsText:
        "luxury homes, investment property , gated community,, " +
        "a,b,c,d,e,f,g,h,i,j,k",
    })
    expect(parsed.interests).toHaveLength(10)
    expect(parsed.interests.slice(0, 3)).toEqual([
      "luxury homes",
      "investment property",
      "gated community",
    ])
  })

  it("parses date inputs as UTC midnight", () => {
    const parsed = campaignInputSchema.parse({
      ...validCampaign,
      startDate: "2026-11-01",
      endDate: "2026-11-30",
    })
    expect(parsed.startDate?.toISOString()).toBe("2026-11-01T00:00:00.000Z")
    expect(parsed.endDate?.toISOString()).toBe("2026-11-30T00:00:00.000Z")
  })

  it("also accepts full ISO datetime strings (JSON-serialized dates)", () => {
    const parsed = campaignInputSchema.parse({
      ...validCampaign,
      startDate: "2026-11-01T00:00:00.000Z",
      endDate: "2026-11-30T00:00:00.000Z",
    })
    expect(parsed.startDate?.toISOString()).toBe("2026-11-01T00:00:00.000Z")
    expect(parsed.endDate?.toISOString()).toBe("2026-11-30T00:00:00.000Z")
  })

  it("returns validation errors instead of throwing for malformed dates", () => {
    expect(() =>
      campaignInputSchema.safeParse({ ...validCampaign, endDate: "not-a-date" }),
    ).not.toThrow()

    const malformed = campaignInputSchema.safeParse({
      ...validCampaign,
      startDate: "2026-11-01",
      endDate: "not-a-date",
    })
    expect(malformed.success).toBe(false)
    if (!malformed.success) {
      expect(malformed.error.issues.some((issue) => issue.path.includes("endDate"))).toBe(true)
    }
  })

  it("rejects an end date before the start date", () => {
    const result = campaignInputSchema.safeParse({
      ...validCampaign,
      startDate: "2026-11-30",
      endDate: "2026-11-01",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("endDate"))).toBe(true)
    }
  })

  it("validates the age range bounds", () => {
    expect(campaignInputSchema.safeParse({ ...validCampaign, ageRangeMin: "12" }).success).toBe(
      false,
    )
    expect(campaignInputSchema.safeParse({ ...validCampaign, ageRangeMax: "101" }).success).toBe(
      false,
    )

    const reversed = campaignInputSchema.safeParse({
      ...validCampaign,
      ageRangeMin: "55",
      ageRangeMax: "25",
    })
    expect(reversed.success).toBe(false)

    const parsed = campaignInputSchema.parse({
      ...validCampaign,
      ageRangeMin: "25",
      ageRangeMax: "55",
    })
    expect(parsed.ageRangeMin).toBe(25)
    expect(parsed.ageRangeMax).toBe(55)
  })

  it("requires a name of at least two characters", () => {
    expect(campaignInputSchema.safeParse({ name: "A" }).success).toBe(false)
    expect(campaignInputSchema.safeParse({ name: "  A  " }).success).toBe(false)
  })

  it("rejects non-http video URLs", () => {
    expect(
      campaignInputSchema.safeParse({ ...validCampaign, videoUrl: "javascript:alert(1)" }).success,
    ).toBe(false)
    expect(
      campaignInputSchema.safeParse({
        ...validCampaign,
        videoUrl: "https://youtube.com/watch?v=abc",
      }).success,
    ).toBe(true)
  })
})

describe("campaignListQuerySchema", () => {
  it("coerces paging values and keeps a valid status", () => {
    const parsed = campaignListQuerySchema.parse({ page: "2", pageSize: "20", status: "ACTIVE" })
    expect(parsed).toEqual({ page: 2, pageSize: 20, status: "ACTIVE", search: undefined })
  })

  it("rejects out-of-range pages and unknown statuses", () => {
    expect(campaignListQuerySchema.safeParse({ page: "0" }).success).toBe(false)
    expect(campaignListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false)
    expect(campaignListQuerySchema.safeParse({ status: "LIVE" }).success).toBe(false)
  })
})

describe("parseCampaignListQuery", () => {
  it("fills in defaults for empty params", () => {
    expect(parseCampaignListQuery({})).toEqual({
      page: 1,
      pageSize: 10,
      status: undefined,
      search: undefined,
    })
  })

  it("reads URLSearchParams and takes the first repeated value", () => {
    const parsed = parseCampaignListQuery(
      new URLSearchParams("page=3&status=PAUSED&search=site&search=condapur"),
    )
    expect(parsed.page).toBe(3)
    expect(parsed.status).toBe("PAUSED")
    expect(parsed.search).toBe("site")
  })

  it("falls back to defaults when any value is invalid", () => {
    expect(parseCampaignListQuery({ page: "abc", status: "LIVE" })).toEqual({
      page: 1,
      pageSize: 10,
      status: undefined,
      search: undefined,
    })
  })
})
