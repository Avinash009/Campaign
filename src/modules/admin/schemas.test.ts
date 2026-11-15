import { describe, expect, it } from "vitest"
import {
  businessStatusUpdateSchema,
  industryCreateSchema,
  industryUpdateSchema,
  parseAdminBusinessListQuery,
  parseAdminCampaignListQuery,
  parseRupeesToPaise,
  planCreateSchema,
  planUpdateSchema,
  splitFeatureList,
} from "./schemas"

describe("parseAdminBusinessListQuery", () => {
  it("defaults to page 1, 10 rows, all statuses", () => {
    expect(parseAdminBusinessListQuery({})).toEqual({ page: 1, pageSize: 10 })
  })

  it("keeps valid filters and reads URLSearchParams", () => {
    expect(
      parseAdminBusinessListQuery(new URLSearchParams("?page=2&pageSize=20&status=SUSPENDED&search=green")),
    ).toEqual({ page: 2, pageSize: 20, status: "SUSPENDED", search: "green" })
  })

  it("takes the first value of repeated params and drops blank searches", () => {
    expect(
      parseAdminBusinessListQuery({ status: ["ACTIVE", "SUSPENDED"], search: "   " }),
    ).toEqual({ page: 1, pageSize: 10, status: "ACTIVE" })
  })

  it("falls back to defaults for an unknown status or oversized page size", () => {
    expect(parseAdminBusinessListQuery({ status: "DELETED" })).toEqual({ page: 1, pageSize: 10 })
    expect(parseAdminBusinessListQuery({ pageSize: "500" })).toEqual({ page: 1, pageSize: 10 })
  })
})

describe("parseAdminCampaignListQuery", () => {
  it("accepts campaign statuses and drops unknown ones", () => {
    expect(parseAdminCampaignListQuery({ status: "PAUSED" })).toEqual({
      page: 1,
      pageSize: 10,
      status: "PAUSED",
    })
    expect(parseAdminCampaignListQuery({ status: "ARCHIVED" })).toMatchObject({ status: "ARCHIVED" })
    expect(parseAdminCampaignListQuery({ status: "deleted" })).toEqual({ page: 1, pageSize: 10 })
  })
})

describe("businessStatusUpdateSchema", () => {
  it("accepts ACTIVE and SUSPENDED only", () => {
    expect(businessStatusUpdateSchema.parse({ status: "SUSPENDED" })).toEqual({
      status: "SUSPENDED",
    })
    expect(() => businessStatusUpdateSchema.parse({ status: "DELETED" })).toThrow()
  })
})

describe("parseRupeesToPaise", () => {
  it("converts whole rupees to integer paise", () => {
    expect(parseRupeesToPaise("999")).toBe(99900)
    expect(parseRupeesToPaise(" 2499 ")).toBe(249900)
  })

  it("returns undefined for blank or invalid input", () => {
    expect(parseRupeesToPaise("")).toBeUndefined()
    expect(parseRupeesToPaise("-10")).toBeUndefined()
    expect(parseRupeesToPaise("abc")).toBeUndefined()
  })
})

describe("splitFeatureList", () => {
  it("splits lines and commas, trims, de-duplicates and caps at 12", () => {
    expect(splitFeatureList("Analytics, CSV export\nPriority support")).toEqual([
      "Analytics",
      "CSV export",
      "Priority support",
    ])
    expect(splitFeatureList("Same\nSame")).toEqual(["Same"])
    expect(splitFeatureList(Array.from({ length: 15 }, (_, i) => `Feature ${i}`).join("\n"))).toHaveLength(12)
  })

  it("returns undefined when the field was not supplied", () => {
    expect(splitFeatureList(undefined)).toBeUndefined()
  })
})

describe("industry schemas", () => {
  it("accepts a full create payload and lets the slug be blank", () => {
    const parsed = industryCreateSchema.parse({
      name: "Hospitality",
      slug: "",
      description: "",
      iconKey: "hospitality",
      sortOrder: 9,
      isActive: true,
    })
    expect(parsed.slug).toBeUndefined()
    expect(parsed.description).toBeUndefined()
  })

  it("rejects unsafe slugs and empty names", () => {
    expect(() =>
      industryCreateSchema.parse({
        name: "Hospitality",
        slug: "Not A Slug",
        sortOrder: 1,
        isActive: true,
      }),
    ).toThrow()
    expect(() =>
      industryCreateSchema.parse({ name: "A", sortOrder: 1, isActive: true }),
    ).toThrow()
  })

  it("requires at least one field on update", () => {
    expect(() => industryUpdateSchema.parse({})).toThrow()
    expect(industryUpdateSchema.parse({ isActive: false })).toEqual({ isActive: false })
  })
})

describe("plan schemas", () => {
  const createPayload = {
    name: "Growth",
    slug: "",
    description: "For growing teams.",
    amountRupees: "2499",
    interval: "MONTHLY" as const,
    campaignLimit: "5",
    memberLimit: "",
    featuresText: "5 active campaigns\nAnalytics & CSV export",
    isFeatured: true,
    isActive: true,
    sortOrder: 2,
  }

  it("converts rupees to paise and feature text to a list on create", () => {
    const parsed = planCreateSchema.parse(createPayload)
    expect(parsed.amountInPaise).toBe(249900)
    expect(parsed.campaignLimit).toBe(5)
    expect(parsed.memberLimit).toBeUndefined()
    expect(parsed.features).toEqual(["5 active campaigns", "Analytics & CSV export"])
    expect(parsed.slug).toBeUndefined()
  })

  it("rejects a missing price or a future-dated interval value", () => {
    expect(() => planCreateSchema.parse({ ...createPayload, amountRupees: "" })).toThrow()
    expect(() =>
      planCreateSchema.parse({ ...createPayload, interval: "WEEKLY" }),
    ).toThrow()
  })

  it("only includes transforms for fields supplied on update", () => {
    expect(planUpdateSchema.parse({ isActive: false })).toEqual({ isActive: false })
    expect(planUpdateSchema.parse({ amountRupees: "999" })).toEqual({ amountInPaise: 99900 })
    expect(planUpdateSchema.parse({ featuresText: "" })).toEqual({ features: [] })
    expect(() => planUpdateSchema.parse({})).toThrow()
  })

  it("keeps blank limits as undefined (unlimited)", () => {
    const parsed = planCreateSchema.parse({
      ...createPayload,
      campaignLimit: "",
      memberLimit: "",
    })
    expect(parsed.campaignLimit).toBeUndefined()
    expect(parsed.memberLimit).toBeUndefined()
  })
})
