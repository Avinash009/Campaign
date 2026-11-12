import { describe, expect, it } from "vitest"
import { publishBlockers } from "./service"

const completeCampaign = {
  headline: "Signature 2 & 3 BHK apartments",
  promoDescription: "Gated community homes in Kondapur.",
  description: null,
  contactPhone: "+91 98480 12345",
  contactEmail: null,
  endDate: null,
}

describe("publishBlockers", () => {
  it("returns no blockers for a complete campaign", () => {
    expect(publishBlockers(completeCampaign)).toEqual([])
  })

  it("accepts a description when the promotional description is missing", () => {
    expect(
      publishBlockers({
        ...completeCampaign,
        promoDescription: "   ",
        description: "Internal description used as a fallback on the page.",
      }),
    ).toEqual([])
  })

  it("requires a headline", () => {
    expect(publishBlockers({ ...completeCampaign, headline: "   " })).toEqual(["headline"])
  })

  it("requires either a promotional or campaign description", () => {
    expect(
      publishBlockers({
        ...completeCampaign,
        promoDescription: null,
        description: "",
      }),
    ).toEqual(["description"])
  })

  it("requires at least one contact channel", () => {
    expect(
      publishBlockers({
        ...completeCampaign,
        contactPhone: "",
        contactEmail: null,
      }),
    ).toEqual(["contact"])
    expect(
      publishBlockers({
        ...completeCampaign,
        contactPhone: null,
        contactEmail: "sales@business.test",
      }),
    ).toEqual([])
  })

  it("blocks publishing when the end date is in the past", () => {
    expect(
      publishBlockers({
        ...completeCampaign,
        endDate: new Date("2020-01-01T00:00:00.000Z"),
      }),
    ).toEqual(["endDate"])
  })

  it("allows a campaign ending today (UTC)", () => {
    const now = new Date()
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    )
    expect(publishBlockers({ ...completeCampaign, endDate: today })).toEqual([])
  })

  it("reports every blocker at once", () => {
    expect(
      publishBlockers({
        headline: null,
        promoDescription: null,
        description: null,
        contactPhone: null,
        contactEmail: null,
        endDate: new Date("2020-01-01T00:00:00.000Z"),
      }),
    ).toEqual(["headline", "description", "contact", "endDate"])
  })
})
