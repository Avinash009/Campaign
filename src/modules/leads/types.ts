import type { LeadActivityType, LeadSource, LeadStatus, UserRole } from "@prisma/client"

/**
 * Lead DTOs returned by the service layer. Dates stay as `Date` objects;
 * pages format them with `src/lib/format.ts`.
 */

export interface LeadCampaignRef {
  id: string
  name: string
  slug: string
}

export interface LeadUserRef {
  id: string
  name: string
}

export interface LeadListItem {
  id: string
  name: string
  phone: string
  email: string | null
  city: string | null
  interestedIn: string | null
  status: LeadStatus
  source: LeadSource
  createdAt: Date
  nextFollowUpAt: Date | null
  campaign: LeadCampaignRef | null
  assignedTo: LeadUserRef | null
}

export interface LeadListResult {
  items: LeadListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LeadActivityDto {
  id: string
  type: LeadActivityType
  actorName: string | null
  fromStatus: LeadStatus | null
  toStatus: LeadStatus | null
  note: string | null
  scheduledFor: Date | null
  createdAt: Date
}

export interface LeadDetail {
  id: string
  reference: string
  name: string
  phone: string
  email: string | null
  city: string | null
  interestedIn: string | null
  message: string | null
  status: LeadStatus
  source: LeadSource
  assignedTo: (LeadUserRef & { email: string }) | null
  campaign: LeadCampaignRef | null
  consentGiven: boolean
  consentText: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  referrer: string | null
  lastContactedAt: Date | null
  nextFollowUpAt: Date | null
  convertedAt: Date | null
  lostAt: Date | null
  createdAt: Date
  updatedAt: Date
  activities: LeadActivityDto[]
}

export interface LeadAssignee {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface LeadCampaignOption {
  id: string
  name: string
  status: string
}

export interface LeadFilterOptions {
  assignees: LeadAssignee[]
  campaigns: LeadCampaignOption[]
}

export interface LeadEnquiryResult {
  reference: string
  duplicate: boolean
}

export interface LeadExportResult {
  csv: string
  filename: string
  rowCount: number
}
