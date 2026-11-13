import type { LeadActivityType, LeadSource, LeadStatus } from "@prisma/client"

/**
 * Display labels shared by server pages and client components. Kept free of
 * Prisma runtime imports so forms can use them safely.
 */

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  LOST: "Lost",
}

export const LEAD_STATUS_DESCRIPTIONS: Record<LeadStatus, string> = {
  NEW: "Just arrived. Nobody has contacted this customer yet.",
  CONTACTED: "You have reached out at least once.",
  INTERESTED: "The customer showed active interest in your offer.",
  QUALIFIED: "The customer is a good fit and ready for a deeper conversation.",
  CONVERTED: "The enquiry became a customer or booking.",
  LOST: "The customer is not proceeding right now.",
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  CAMPAIGN_PAGE: "Campaign page",
  DIRECT: "Direct",
  ORGANIC: "Organic",
  SOCIAL: "Social",
  EMAIL: "Email",
  REFERRAL: "Referral",
  OTHER: "Other",
}

export const LEAD_ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  CREATED: "Enquiry received",
  STATUS_CHANGED: "Status changed",
  NOTE_ADDED: "Note added",
  ASSIGNED: "Assignment changed",
  FOLLOW_UP_SCHEDULED: "Follow-up scheduled",
  FOLLOW_UP_COMPLETED: "Follow-up completed",
  CONTACT_ATTEMPTED: "Contact attempted",
}

/** Tone used by the timeline icons (not a status badge). */
export const LEAD_ACTIVITY_TONES: Record<LeadActivityType, "primary" | "success" | "warning" | "muted"> = {
  CREATED: "primary",
  STATUS_CHANGED: "primary",
  NOTE_ADDED: "muted",
  ASSIGNED: "warning",
  FOLLOW_UP_SCHEDULED: "warning",
  FOLLOW_UP_COMPLETED: "success",
  CONTACT_ATTEMPTED: "muted",
}
