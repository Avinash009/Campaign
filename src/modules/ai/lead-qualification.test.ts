import { describe, expect, it } from "vitest"
import type { AiLeadQualificationInput } from "./index"
import { RuleBasedLeadScoringService, qualifyLead } from "./lead-qualification"

const now = new Date("2026-01-10T10:00:00.000Z")
const recent = new Date("2026-01-09T10:00:00.000Z")

function input(overrides: Partial<AiLeadQualificationInput> = {}): AiLeadQualificationInput {
  return {
    status: "NEW",
    source: "CAMPAIGN_PAGE",
    consentGiven: true,
    createdAt: recent,
    now,
    ...overrides,
  }
}

describe("qualifyLead", () => {
  it("adds only the listed points for a minimal recent enquiry", () => {
    const result = qualifyLead(input())

    // base 10 + consent 10 + campaign-source 5 + recent 3
    expect(result.score).toBe(28)
    expect(result.category).toBe("cold")
    expect(result.reasons).toHaveLength(4)
  })

  it("scores a detailed, qualified referral as hot with a 100 cap", () => {
    const result = qualifyLead(
      input({
        status: "QUALIFIED",
        source: "REFERRAL",
        email: "priya@example.com",
        city: "Hyderabad",
        interestedIn: "3 BHK apartment near Kondapur",
        message:
          "I am interested in a site visit this weekend. Please call me with the price and quote.",
      }),
    )

    expect(result.score).toBe(93)
    expect(result.category).toBe("hot")
    expect(result.reasons.some((reason) => reason.includes("qualified"))).toBe(true)
    expect(result.reasons.some((reason) => reason.includes("Buying-intent"))).toBe(true)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it("deprioritises a lost lead", () => {
    const result = qualifyLead(input({ status: "LOST" }))

    expect(result.score).toBe(8)
    expect(result.reasons.some((reason) => reason.includes("-20"))).toBe(true)
  })

  it("does not award the recency bonus to an older enquiry", () => {
    const result = qualifyLead(
      input({ createdAt: new Date("2026-01-01T10:00:00.000Z") }),
    )
    expect(result.score).toBe(25)
  })

  it("is deterministic for the same input", () => {
    const lead = input({ city: "Pune", interestedIn: "2 BHK" })
    expect(qualifyLead(lead)).toEqual(qualifyLead(lead))
  })

  it("asks for the missing details", () => {
    const result = qualifyLead(input({ status: "NEW" }))

    expect(result.suggestedQuestions.length).toBeLessThanOrEqual(4)
    expect(result.suggestedQuestions).toContain("What exactly are you looking for?")
    expect(result.suggestedQuestions).toContain("Which area or city should the team focus on?")
  })

  it("stops asking for details that are already present", () => {
    const result = qualifyLead(
      input({
        city: "Hyderabad",
        interestedIn: "3 BHK",
        email: "lead@example.com",
        message: "Please share the price list, floor plans and payment schedule for this project.",
        status: "CONTACTED",
      }),
    )

    expect(result.suggestedQuestions).not.toContain("What exactly are you looking for?")
    expect(result.suggestedQuestions).not.toContain(
      "Which area or city should the team focus on?",
    )
  })
})

describe("RuleBasedLeadScoringService", () => {
  it("delegates to the same scoring rules", () => {
    const service = new RuleBasedLeadScoringService()
    expect(service.qualifyLead(input())).toEqual(qualifyLead(input()))
  })
})
