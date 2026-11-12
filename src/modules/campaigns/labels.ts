import type { CampaignObjective, CtaType } from "@prisma/client"

/**
 * Display labels shared by server pages and client components. Kept free of
 * Prisma runtime imports so forms can use them safely.
 */

export const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  AWARENESS: "Awareness",
  LEAD_GENERATION: "Lead generation",
  SALES: "Sales",
  APPOINTMENT_BOOKING: "Appointment booking",
  PROMOTION: "Promotion",
}

export const OBJECTIVE_DESCRIPTIONS: Record<CampaignObjective, string> = {
  AWARENESS: "Get your business and offer in front of more people.",
  LEAD_GENERATION: "Collect customer enquiries from your landing page.",
  SALES: "Drive direct purchases or bookings for a specific offer.",
  APPOINTMENT_BOOKING: "Fill appointment or site-visit slots.",
  PROMOTION: "Promote a limited-period discount or launch.",
}

export const CTA_LABELS: Record<CtaType, string> = {
  ENQUIRE_NOW: "Enquire now",
  CONTACT_US: "Contact us",
  BOOK_APPOINTMENT: "Book an appointment",
  REQUEST_CALLBACK: "Request a callback",
  GET_QUOTE: "Get a quote",
  SCHEDULE_VISIT: "Schedule a visit",
}

/** Short action label used on the public landing page's primary button. */
export const CTA_ACTION_LABELS: Record<CtaType, string> = {
  ENQUIRE_NOW: "Talk to us",
  CONTACT_US: "Contact us",
  BOOK_APPOINTMENT: "Book an appointment",
  REQUEST_CALLBACK: "Request a callback",
  GET_QUOTE: "Get a quote",
  SCHEDULE_VISIT: "Schedule a visit",
}
