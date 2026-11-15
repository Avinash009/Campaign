import { describe, expect, it } from "vitest"
import type { AiCampaignContext, AiCampaignPerformance } from "./index"
import {
  RuleBasedCampaignAssistantService,
  buildCampaignSuggestions,
} from "./campaign-assistant"

function campaign(overrides: Partial<AiCampaignContext> = {}): AiCampaignContext {
  return {
    id: "campaign-1",
    name: "Kondapur launch",
    status: "ACTIVE",
    objective: "LEAD_GENERATION",
    headline: "Spacious 3 BHK homes in Kondapur",
    promoDescription: "Move-in ready apartments with a clubhouse and covered parking.",
    description: "Internal notes",
    productDetails: "3 BHK apartments with a clubhouse.",
    offerDetails: "Pre-launch pricing",
    priceDisplay: "₹85 Lakhs onwards",
    priceInPaise: 8_500_000_00,
    contactPhone: "919845123456",
    contactEmail: "sales@example.com",
    targetLocation: "Kondapur, Hyderabad",
    targetAudience: "Families upgrading to a larger home",
    imageCount: 2,
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2030-12-31T00:00:00.000Z"),
    leadCount: 5,
    industryName: "Real estate",
    ...overrides,
  }
}

function performance(
  overrides: Partial<AiCampaignPerformance> = {},
): AiCampaignPerformance {
  return {
    periodLabel: "Last 30 days",
    pageViews: 100,
    uniqueVisitors: 60,
    enquiries: 6,
    conversionRate: 6,
    qualifiedLeads: 2,
    convertedLeads: 1,
    ...overrides,
  }
}

function titles(context: AiCampaignContext, stats: AiCampaignPerformance): string[] {
  return buildCampaignSuggestions(context, stats).map((suggestion) => suggestion.title)
}

describe("buildCampaignSuggestions", () => {
  it("warns when an active campaign has no tracked visits", () => {
    const stats = performance({
      pageViews: 0,
      uniqueVisitors: 0,
      enquiries: 0,
      conversionRate: null,
    })
    const suggestions = buildCampaignSuggestions(campaign(), stats)

    expect(suggestions.some((suggestion) => suggestion.severity === "warning")).toBe(true)
    expect(titles(campaign(), stats)).toContain("No tracked visits in this period")
  })

  it("does not report tracked visits for a draft campaign", () => {
    const draft = campaign({ status: "DRAFT" })
    const stats = performance({ pageViews: 0, uniqueVisitors: 0, enquiries: 0, conversionRate: null })
    const list = titles(draft, stats)

    expect(list).not.toContain("No tracked visits in this period")
    expect(list).toContain("Campaign is still a draft")
  })

  it("flags traffic without enquiries", () => {
    const list = titles(
      campaign(),
      performance({ pageViews: 40, uniqueVisitors: 25, enquiries: 0, conversionRate: 0 }),
    )
    expect(list).toContain("Visitors are not enquiring")
  })

  it("flags a low conversion rate", () => {
    const list = titles(
      campaign(),
      performance({ pageViews: 120, enquiries: 1, conversionRate: 0.8 }),
    )
    expect(list).toContain("Low enquiry conversion")
  })

  it("acknowledges a converting page", () => {
    const suggestions = buildCampaignSuggestions(campaign(), performance())
    const match = suggestions.find(
      (suggestion) => suggestion.title === "Landing page is converting",
    )

    expect(match?.severity).toBe("info")
    expect(match?.detail).toContain("6.0%")
  })

  it("lists concrete content gaps", () => {
    const list = titles(
      campaign({
        headline: "",
        promoDescription: null,
        description: null,
        contactPhone: null,
        contactEmail: null,
        imageCount: 0,
        targetAudience: null,
        targetLocation: null,
        priceDisplay: null,
        priceInPaise: null,
        endDate: null,
      }),
      performance({ pageViews: 5, uniqueVisitors: 3, enquiries: 0, conversionRate: 0 }),
    )

    expect(list).toContain("Add a headline")
    expect(list).toContain("Add a promotional description")
    expect(list).toContain("Add a contact method")
    expect(list).toContain("Add at least one image")
    expect(list).toContain("Describe the audience")
    expect(list).toContain("Add a target location")
    expect(list).toContain("Consider showing a price")
    expect(list).toContain("No end date set")
  })

  it("warns when the end date has passed", () => {
    const list = titles(
      campaign({ endDate: new Date("2020-01-01T00:00:00.000Z") }),
      performance(),
    )
    expect(list).toContain("End date has passed")
  })

  it("sorts warnings before improvements and notes", () => {
    const suggestions = buildCampaignSuggestions(
      campaign({ headline: "", targetAudience: null }),
      performance({ pageViews: 15, uniqueVisitors: 10, enquiries: 0, conversionRate: 0 }),
    )
    const severities = suggestions.map((suggestion) => suggestion.severity)
    const firstInfo = severities.indexOf("info")
    const lastWarning = severities.lastIndexOf("warning")

    if (firstInfo !== -1 && lastWarning !== -1) {
      expect(lastWarning).toBeLessThan(firstInfo)
    }
  })

  it("caps the list at eight suggestions", () => {
    const suggestions = buildCampaignSuggestions(
      campaign({
        headline: "",
        promoDescription: null,
        description: null,
        contactPhone: null,
        contactEmail: null,
        imageCount: 0,
        targetAudience: null,
        targetLocation: null,
        priceDisplay: null,
        priceInPaise: null,
        endDate: null,
      }),
      performance({ pageViews: 15, uniqueVisitors: 10, enquiries: 0, conversionRate: 0 }),
    )

    expect(suggestions).toHaveLength(8)
  })

  it("reports no obvious gaps for a complete, finished campaign", () => {
    const suggestions = buildCampaignSuggestions(
      campaign({ status: "COMPLETED" }),
      performance({ pageViews: 5, uniqueVisitors: 3, enquiries: 0, conversionRate: 0 }),
    )

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.title).toBe("No obvious gaps")
  })
})

describe("RuleBasedCampaignAssistantService", () => {
  it("delegates to the same review rules", () => {
    const service = new RuleBasedCampaignAssistantService()
    expect(
      service.suggestImprovements({ campaign: campaign(), performance: performance() }),
    ).toEqual(buildCampaignSuggestions(campaign(), performance()))
  })
})
