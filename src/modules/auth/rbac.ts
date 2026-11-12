import type { UserRole } from "@prisma/client"
import { ApiError } from "@/lib/errors"

/**
 * Role-based access control for business actions (docs/PRD.md §2).
 * Pure functions so they are trivially unit-testable and safe to reuse in
 * services and UI (hide a button) alike.
 *
 * OWNER  — everything, including billing, business profile and team roles.
 * ADMIN  — day-to-day management: profile, team, campaigns, all leads.
 * MEMBER — works leads assigned to them; no management actions.
 */

export function isManager(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN"
}

/** Business profile + billing changes are owner-only (admins cannot change ownership). */
export function canManageBusiness(role: UserRole): boolean {
  return role === "OWNER"
}

/** Owners and admins may edit the public business profile (logo, contact details). */
export function canEditProfile(role: UserRole): boolean {
  return isManager(role)
}

/** Team invitations and member management. */
export function canManageTeam(role: UserRole): boolean {
  return isManager(role)
}

/** Creating/editing/publishing campaigns. */
export function canWriteCampaigns(role: UserRole): boolean {
  return isManager(role)
}

/** Assigning leads to teammates. */
export function canAssignLeads(role: UserRole): boolean {
  return isManager(role)
}

/** A member may edit only leads assigned to them; managers may edit any. */
export function canEditLead(role: UserRole, isAssignee: boolean): boolean {
  return isManager(role) || isAssignee
}

/** Who may be invited. Ownership cannot be granted through an invite. */
export const INVITABLE_ROLES = ["ADMIN", "MEMBER"] as const
export type InvitableRole = (typeof INVITABLE_ROLES)[number]

export function canInviteRole(role: InvitableRole): boolean {
  return role === "ADMIN" || role === "MEMBER"
}

/** Throws a 403 unless the caller's role is allowed. */
export function assertRole(role: UserRole, allowed: readonly UserRole[], message?: string): void {
  if (!allowed.includes(role)) {
    throw ApiError.forbidden(message ?? "You do not have permission to do that.")
  }
}
