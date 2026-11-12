import { describe, expect, it } from "vitest"
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TRANSITIONS,
  allowedCampaignTransitions,
  assertCampaignTransition,
  canTransitionCampaign,
} from "./lifecycle"

describe("campaign lifecycle transitions", () => {
  it("allows the documented forward transitions", () => {
    expect(canTransitionCampaign("DRAFT", "ACTIVE")).toBe(true)
    expect(canTransitionCampaign("DRAFT", "ARCHIVED")).toBe(true)
    expect(canTransitionCampaign("ACTIVE", "PAUSED")).toBe(true)
    expect(canTransitionCampaign("ACTIVE", "COMPLETED")).toBe(true)
    expect(canTransitionCampaign("ACTIVE", "ARCHIVED")).toBe(true)
    expect(canTransitionCampaign("PAUSED", "ACTIVE")).toBe(true)
    expect(canTransitionCampaign("PAUSED", "COMPLETED")).toBe(true)
    expect(canTransitionCampaign("PAUSED", "ARCHIVED")).toBe(true)
    expect(canTransitionCampaign("COMPLETED", "ARCHIVED")).toBe(true)
  })

  it("blocks skipping stages and reopening archived campaigns", () => {
    expect(canTransitionCampaign("DRAFT", "PAUSED")).toBe(false)
    expect(canTransitionCampaign("DRAFT", "COMPLETED")).toBe(false)
    expect(canTransitionCampaign("ACTIVE", "DRAFT")).toBe(false)
    expect(canTransitionCampaign("COMPLETED", "ACTIVE")).toBe(false)
    expect(canTransitionCampaign("ARCHIVED", "ACTIVE")).toBe(false)
    expect(canTransitionCampaign("ARCHIVED", "DRAFT")).toBe(false)
  })

  it("treats ARCHIVED as terminal", () => {
    expect(allowedCampaignTransitions("ARCHIVED")).toEqual([])
    expect(CAMPAIGN_TRANSITIONS.ARCHIVED).toHaveLength(0)
  })

  it("returns the allowed targets for each status", () => {
    expect(allowedCampaignTransitions("DRAFT")).toEqual(["ACTIVE", "ARCHIVED"])
    expect(allowedCampaignTransitions("ACTIVE")).toEqual(["PAUSED", "COMPLETED", "ARCHIVED"])
    expect(allowedCampaignTransitions("PAUSED")).toEqual(["ACTIVE", "COMPLETED", "ARCHIVED"])
    expect(allowedCampaignTransitions("COMPLETED")).toEqual(["ARCHIVED"])
  })

  it("labels every status", () => {
    expect(CAMPAIGN_STATUS_LABELS).toEqual({
      DRAFT: "Draft",
      ACTIVE: "Active",
      PAUSED: "Paused",
      COMPLETED: "Completed",
      ARCHIVED: "Archived",
    })
  })
})

describe("assertCampaignTransition", () => {
  it("does not throw for allowed transitions", () => {
    expect(() => assertCampaignTransition("DRAFT", "ACTIVE")).not.toThrow()
    expect(() => assertCampaignTransition("PAUSED", "ACTIVE")).not.toThrow()
  })

  it("throws status_unchanged when the target equals the current status", () => {
    expect(() => assertCampaignTransition("ACTIVE", "ACTIVE")).toThrowError(
      /already active/i,
    )
    try {
      assertCampaignTransition("ACTIVE", "ACTIVE")
    } catch (error) {
      expect(error).toMatchObject({ status: 409, code: "status_unchanged" })
    }
  })

  it("throws invalid_status_transition for disallowed targets", () => {
    try {
      assertCampaignTransition("DRAFT", "PAUSED")
      throw new Error("expected assertCampaignTransition to throw")
    } catch (error) {
      expect(error).toMatchObject({ status: 409, code: "invalid_status_transition" })
    }
  })
})
