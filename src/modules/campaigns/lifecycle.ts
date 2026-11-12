import type { CampaignStatus } from "@prisma/client"
import { ApiError } from "@/lib/errors"

/**
 * Campaign lifecycle rules (docs/PRD.md §4). Pure functions so the allowed
 * transitions are unit tested and reused by both the service and the UI.
 *
 * DRAFT ──► ACTIVE ──► PAUSED ──► ACTIVE
 *   │         │           │
 *   └─────────┴───────────┴──► COMPLETED ──► ARCHIVED
 *   └──────────────────────────────────────► ARCHIVED
 */

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
}

export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "COMPLETED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
}

/** Action labels for the transitions a manager can trigger. */
export const TRANSITION_ACTIONS: Partial<
  Record<CampaignStatus, { label: string; variant: "default" | "outline" | "destructive" }>
> = {
  ACTIVE: { label: "Publish", variant: "default" },
  PAUSED: { label: "Pause", variant: "outline" },
  COMPLETED: { label: "Mark complete", variant: "outline" },
  ARCHIVED: { label: "Archive", variant: "destructive" },
}

export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus): boolean {
  return CAMPAIGN_TRANSITIONS[from].includes(to)
}

export function allowedCampaignTransitions(from: CampaignStatus): readonly CampaignStatus[] {
  return CAMPAIGN_TRANSITIONS[from]
}

/** Throws a 409 when a status change is not allowed from the current state. */
export function assertCampaignTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (from === to) {
    throw ApiError.conflict(
      "status_unchanged",
      `This campaign is already ${CAMPAIGN_STATUS_LABELS[to].toLowerCase()}.`,
    )
  }
  if (!canTransitionCampaign(from, to)) {
    throw ApiError.conflict(
      "invalid_status_transition",
      `A ${CAMPAIGN_STATUS_LABELS[from].toLowerCase()} campaign cannot be moved to ${CAMPAIGN_STATUS_LABELS[to].toLowerCase()}.`,
    )
  }
}
