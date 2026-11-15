import { describe, expect, it } from "vitest"
import type { AiFollowUpInput } from "./index"
import { RuleBasedFollowUpService, suggestFollowUp } from "./follow-up"

const now = new Date("2026-01-10T10:00:00.000Z")

function input(overrides: Partial<AiFollowUpInput> = {}): AiFollowUpInput {
  return {
    leadName: "Priya Sharma",
    businessName: "Sri Green Realty",
    status: "NEW",
    consentGiven: true,
    createdAt: new Date("2026-01-09T10:00:00.000Z"),
    now,
    ...overrides,
  }
}

describe("suggestFollowUp", () => {
  it("drafts call and WhatsApp messages with the lead's first name", () => {
    const plan = suggestFollowUp(input())

    expect(plan.priority).toBe("medium")
    expect(plan.messages.map((message) => message.channel)).toEqual(["CALL", "WHATSAPP"])
    expect(plan.messages[1]?.body).toContain("Priya")
    expect(plan.messages[1]?.body).toContain("Sri Green Realty")
    expect(plan.suggestedWhen).toBe("Within 24 hours")
  })

  it("adds an email draft only when the lead shared an email address", () => {
    const plan = suggestFollowUp(input({ email: "priya@example.com" }))

    const email = plan.messages.find((message) => message.channel === "EMAIL")
    expect(email?.subject).toContain("Sri Green Realty")
    expect(email?.body).toContain("Priya")
  })

  it("omits the email draft without an address", () => {
    const plan = suggestFollowUp(input())
    expect(plan.messages.some((message) => message.channel === "EMAIL")).toBe(false)
  })

  it("flags an overdue follow-up as high priority", () => {
    const plan = suggestFollowUp(
      input({ nextFollowUpAt: new Date("2026-01-07T10:00:00.000Z") }),
    )

    expect(plan.priority).toBe("high")
    expect(plan.suggestedWhen).toBe("Today")
    expect(plan.summary).toContain("overdue by 3 days")
    expect(plan.cautions.some((caution) => caution.includes("overdue"))).toBe(true)
  })

  it("keeps a future scheduled date", () => {
    const plan = suggestFollowUp(
      input({ nextFollowUpAt: new Date("2026-01-11T10:00:00.000Z") }),
    )

    expect(plan.priority).toBe("medium")
    expect(plan.summary).toContain("scheduled in 1 day")
    expect(plan.suggestedWhen).toBe("Keep the scheduled date")
  })

  it("stops outreach when the customer opted out", () => {
    const plan = suggestFollowUp(
      input({ message: "Please do not call or message me again." }),
    )

    expect(plan.messages).toEqual([])
    expect(plan.priority).toBe("low")
    expect(plan.nextAction).toContain("opt-out")
    expect(plan.cautions.some((caution) => caution.includes("asked not to be contacted"))).toBe(
      true,
    )
  })

  it("warns when consent is not recorded", () => {
    const plan = suggestFollowUp(input({ consentGiven: false }))
    expect(plan.cautions.some((caution) => caution.includes("Consent"))).toBe(true)
  })

  it("drafts only a thank-you for a converted lead", () => {
    const plan = suggestFollowUp(input({ status: "CONVERTED" }))

    expect(plan.priority).toBe("low")
    expect(plan.messages).toHaveLength(1)
    expect(plan.messages[0]?.channel).toBe("WHATSAPP")
    expect(plan.messages[0]?.body).toContain("thank you")
  })

  it("does not draft outreach for a lost lead", () => {
    const plan = suggestFollowUp(input({ status: "LOST" }))

    expect(plan.messages).toEqual([])
    expect(plan.summary).toContain("marked lost")
  })

  it("is deterministic for the same input", () => {
    const lead = input({ interestedIn: "3 BHK", city: "Hyderabad" })
    expect(suggestFollowUp(lead)).toEqual(suggestFollowUp(lead))
  })
})

describe("RuleBasedFollowUpService", () => {
  it("delegates to the same follow-up rules", () => {
    const service = new RuleBasedFollowUpService()
    expect(service.suggestFollowUp(input())).toEqual(suggestFollowUp(input()))
  })
})
