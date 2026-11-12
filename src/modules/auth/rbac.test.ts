import { describe, expect, it } from "vitest"
import {
  assertRole,
  canAssignLeads,
  canEditLead,
  canEditProfile,
  canInviteRole,
  canManageBusiness,
  canManageTeam,
  canWriteCampaigns,
  isManager,
} from "./rbac"
import { ApiError } from "@/lib/errors"

describe("RBAC role capabilities", () => {
  it("treats OWNER and ADMIN as managers, MEMBER not", () => {
    expect(isManager("OWNER")).toBe(true)
    expect(isManager("ADMIN")).toBe(true)
    expect(isManager("MEMBER")).toBe(false)
  })

  it("reserves business profile/billing for the owner", () => {
    expect(canManageBusiness("OWNER")).toBe(true)
    expect(canManageBusiness("ADMIN")).toBe(false)
    expect(canManageBusiness("MEMBER")).toBe(false)
  })

  it("lets owners and admins edit the public business profile", () => {
    expect(canEditProfile("OWNER")).toBe(true)
    expect(canEditProfile("ADMIN")).toBe(true)
    expect(canEditProfile("MEMBER")).toBe(false)
  })

  it("lets managers manage the team, campaigns and lead assignment", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      expect(canManageTeam(role)).toBe(true)
      expect(canWriteCampaigns(role)).toBe(true)
      expect(canAssignLeads(role)).toBe(true)
    }
    expect(canManageTeam("MEMBER")).toBe(false)
    expect(canWriteCampaigns("MEMBER")).toBe(false)
    expect(canAssignLeads("MEMBER")).toBe(false)
  })

  it("lets a member edit only their own assigned lead", () => {
    expect(canEditLead("MEMBER", true)).toBe(true)
    expect(canEditLead("MEMBER", false)).toBe(false)
    expect(canEditLead("ADMIN", false)).toBe(true)
    expect(canEditLead("OWNER", false)).toBe(true)
  })

  it("only allows ADMIN/MEMBER invitations", () => {
    expect(canInviteRole("ADMIN")).toBe(true)
    expect(canInviteRole("MEMBER")).toBe(true)
    // Ownership is never grantable by invite.
    expect(canInviteRole("OWNER" as never)).toBe(false)
  })
})

describe("assertRole", () => {
  it("passes for an allowed role", () => {
    expect(() => assertRole("MEMBER", ["OWNER", "ADMIN", "MEMBER"])).not.toThrow()
  })

  it("throws a 403 ApiError for a disallowed role", () => {
    try {
      assertRole("MEMBER", ["OWNER", "ADMIN"])
      expect.unreachable("expected assertRole to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(403)
    }
  })
})
