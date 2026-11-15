import { describe, expect, it } from "vitest"
import { adCopyInputSchema, landingContentInputSchema } from "./schemas"

const details = "3 BHK apartments in Kondapur with a clubhouse and covered parking."

describe("adCopyInputSchema", () => {
  it("defaults the tone and drops blank optional fields", () => {
    const parsed = adCopyInputSchema.parse({
      productDetails: details,
      offerDetails: "   ",
      targetAudience: "",
      industrySlug: "",
    })

    expect(parsed).toEqual({ productDetails: details, tone: "professional" })
  })

  it("keeps supplied values and a chosen tone", () => {
    const parsed = adCopyInputSchema.parse({
      productDetails: details,
      offerDetails: "Pre-launch price",
      targetAudience: "Families in Hyderabad",
      industrySlug: "real-estate",
      tone: "friendly",
    })

    expect(parsed.offerDetails).toBe("Pre-launch price")
    expect(parsed.targetAudience).toBe("Families in Hyderabad")
    expect(parsed.industrySlug).toBe("real-estate")
    expect(parsed.tone).toBe("friendly")
  })

  it("requires at least 10 characters of product details", () => {
    const result = adCopyInputSchema.safeParse({ productDetails: "too short" })
    expect(result.success).toBe(false)
  })

  it("rejects an unknown tone", () => {
    const result = adCopyInputSchema.safeParse({ productDetails: details, tone: "sarcastic" })
    expect(result.success).toBe(false)
  })
})

describe("landingContentInputSchema", () => {
  it("requires a campaign name", () => {
    const result = landingContentInputSchema.safeParse({ productDetails: details })
    expect(result.success).toBe(false)
  })

  it("accepts the landing-page fields", () => {
    const parsed = landingContentInputSchema.parse({
      campaignName: "Kondapur launch",
      productDetails: details,
      targetLocation: "Kondapur, Hyderabad",
      priceDisplay: "₹85 Lakhs onwards",
    })

    expect(parsed.campaignName).toBe("Kondapur launch")
    expect(parsed.targetLocation).toBe("Kondapur, Hyderabad")
    expect(parsed.priceDisplay).toBe("₹85 Lakhs onwards")
    expect(parsed.tone).toBe("professional")
  })
})
