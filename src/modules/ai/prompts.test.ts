import { describe, expect, it } from "vitest"
import { buildAdCopyPrompt, buildLandingContentPrompt } from "./prompts"

const base = {
  businessName: "Sri Green Realty",
  industryName: "Real estate",
  productDetails: "3 BHK apartments in Kondapur with a clubhouse.",
  tone: "friendly" as const,
}

describe("buildAdCopyPrompt", () => {
  it("includes only the supplied facts", () => {
    const prompt = buildAdCopyPrompt(base)

    expect(prompt.user).toContain("Sri Green Realty")
    expect(prompt.user).toContain("3 BHK apartments in Kondapur")
    expect(prompt.user).not.toContain("Offer details")
    expect(prompt.user).toContain('"headlines"')
    expect(prompt.user).toContain('"suggestedCtas"')
    expect(prompt.maxTokens).toBeGreaterThan(0)
  })

  it("carries the honest-output rules", () => {
    const prompt = buildAdCopyPrompt(base)

    expect(prompt.system).toContain("Never invent statistics")
    expect(prompt.system).toContain("Google or Meta")
    expect(prompt.system).toContain("Return only a JSON object")
  })

  it("uses the friendly tone guidance", () => {
    expect(buildAdCopyPrompt(base).user).toContain("Warm, conversational")
  })
})

describe("buildLandingContentPrompt", () => {
  it("includes campaign and location facts when supplied", () => {
    const prompt = buildLandingContentPrompt({
      ...base,
      campaignName: "Kondapur launch",
      targetLocation: "Kondapur, Hyderabad",
      priceDisplay: "₹85 Lakhs onwards",
    })

    expect(prompt.user).toContain("Kondapur launch")
    expect(prompt.user).toContain("Kondapur, Hyderabad")
    expect(prompt.user).toContain("₹85 Lakhs onwards")
    expect(prompt.user).toContain('"promoDescription"')
  })

  it("defaults to the professional tone", () => {
    const prompt = buildLandingContentPrompt({
      ...base,
      tone: undefined,
      campaignName: "Kondapur launch",
    })
    expect(prompt.user).toContain("Calm, credible and factual")
  })
})
