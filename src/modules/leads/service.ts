import { ApiError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { recordFormSubmitEvent } from "@/modules/analytics/service"
import { recordAudit } from "@/modules/audit/service"
import { canAssignLeads, canEditLead, isManager } from "@/modules/auth/rbac"
import type { BusinessContext } from "@/modules/auth/session"
import { createNotification, notifyManagers } from "@/modules/notifications/service"
import {
  DUPLICATE_WINDOW_MS,
  LEAD_EXPORT_LIMIT,
  buildCsv,
  endOfDayIst,
  leadReference,
  normalisePhone,
  startOfDayIst,
  statusUpdateFields,
} from "./helpers"
import {
  ENQUIRY_CONSENT_TEXT,
  leadAssignSchema,
  leadEnquirySchema,
  leadFollowUpCompleteSchema,
  leadFollowUpScheduleSchema,
  leadNoteSchema,
  leadStatusUpdateSchema,
  type LeadListQuery,
} from "./schemas"
import {
  createLeadWithActivity,
  findActiveAssignee,
  findDuplicateLead,
  findEnquiryCampaignBySlug,
  findLeadById,
  findLeadForMutation,
  listAssignees,
  listCampaignOptions,
  listLeads,
  listLeadsForExport,
  updateLeadWithActivity,
  type ListLeadsOptions,
} from "./repository"
import type {
  LeadDetail,
  LeadEnquiryResult,
  LeadExportResult,
  LeadFilterOptions,
  LeadListResult,
} from "./types"

/**
 * Lead module service: public enquiry intake (dedupe + consent), tenant-scoped
 * list/detail reads, status and assignment changes, notes, follow-ups and CSV
 * export. Authorization always uses the caller's verified BusinessContext.
 *
 * MEMBER access rule: members can only see and edit leads assigned to them.
 * Managers (OWNER/ADMIN) work with every lead in the business.
 */

interface EnquiryMeta {
  ipAddress?: string
  visitorId?: string | null
  userAgent?: string | null
}

type LeadListRecord = Awaited<ReturnType<typeof listLeads>>["rows"][number]
type LeadRecord = NonNullable<Awaited<ReturnType<typeof findLeadById>>>

// ---------------------------------------------------------------------------
// Mapping & authorization helpers
// ---------------------------------------------------------------------------

function toLeadListItem(row: LeadListRecord) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    interestedIn: row.interestedIn,
    status: row.status,
    source: row.source,
    createdAt: row.createdAt,
    nextFollowUpAt: row.nextFollowUpAt,
    campaign: row.campaign,
    assignedTo: row.assignedTo,
  }
}

function toLeadDetail(lead: LeadRecord): LeadDetail {
  return {
    id: lead.id,
    reference: leadReference(lead.id),
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    interestedIn: lead.interestedIn,
    message: lead.message,
    status: lead.status,
    source: lead.source,
    assignedTo: lead.assignedTo,
    campaign: lead.campaign,
    consentGiven: lead.consentGiven,
    consentText: lead.consentText,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    utmTerm: lead.utmTerm,
    utmContent: lead.utmContent,
    referrer: lead.referrer,
    lastContactedAt: lead.lastContactedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    convertedAt: lead.convertedAt,
    lostAt: lead.lostAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    activities: lead.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      actorName: activity.actor?.name ?? null,
      fromStatus: activity.fromStatus,
      toStatus: activity.toStatus,
      note: activity.note,
      scheduledFor: activity.scheduledFor,
      createdAt: activity.createdAt,
    })),
  }
}

function resolveListOptions(
  context: BusinessContext,
  query: LeadListQuery,
): Omit<ListLeadsOptions, "page" | "pageSize"> {
  const base: Omit<ListLeadsOptions, "page" | "pageSize"> = {
    status: query.status,
    campaignId: query.campaignId,
    search: query.search,
    searchPhone: query.search ? query.search.replace(/\D/g, "") : undefined,
    from: query.from ? (startOfDayIst(query.from) ?? undefined) : undefined,
    to: query.to ? (endOfDayIst(query.to) ?? undefined) : undefined,
  }

  // Members never get to widen the scope — even by editing the URL.
  if (!isManager(context.role)) return { ...base, assignedToId: context.userId }

  if (query.assignedTo === "me") return { ...base, assignedToId: context.userId }
  if (query.assignedTo === "unassigned") return { ...base, unassignedOnly: true }
  if (query.assignedTo) return { ...base, assignedToId: query.assignedTo }
  return base
}

async function loadLeadOrThrow(context: BusinessContext, leadId: string): Promise<LeadRecord> {
  const lead = await findLeadById(context.businessId, leadId)
  if (!lead) throw ApiError.notFound("Lead not found.")
  if (!isManager(context.role) && lead.assignedToId !== context.userId) {
    // Do not reveal that another member's lead exists.
    throw ApiError.notFound("Lead not found.")
  }
  return lead
}

async function loadLeadForEdit(context: BusinessContext, leadId: string) {
  const lead = await findLeadForMutation(context.businessId, leadId)
  if (!lead) throw ApiError.notFound("Lead not found.")
  if (!canEditLead(context.role, lead.assignedToId === context.userId)) {
    throw ApiError.forbidden(
      "This lead is assigned to someone else. Ask an owner or admin to reassign it to you.",
    )
  }
  return lead
}

function assertCanAssign(context: BusinessContext): void {
  if (!canAssignLeads(context.role)) {
    throw ApiError.forbidden("Only owners and admins can assign leads.")
  }
}

// ---------------------------------------------------------------------------
// Public enquiry intake
// ---------------------------------------------------------------------------

export async function submitEnquiry(
  campaignSlug: string,
  input: unknown,
  meta: EnquiryMeta = {},
): Promise<LeadEnquiryResult> {
  const data = leadEnquirySchema.parse(input)

  // Honeypot: filled by bots only. Return a generic error without touching the DB.
  if (data.website?.trim()) {
    logger.warn("lead.enquiry_honeypot", { ipAddress: meta.ipAddress })
    throw ApiError.badRequest(
      "invalid_submission",
      "We could not accept this enquiry. Please try again.",
    )
  }

  const campaign = await findEnquiryCampaignBySlug(campaignSlug)
  if (!campaign) {
    throw ApiError.notFound("This campaign is not accepting enquiries right now.")
  }

  const phone = normalisePhone(data.phone)
  if (phone.length < 10) {
    throw ApiError.badRequest("invalid_phone", "Enter a valid phone number with area code.")
  }

  const duplicate = await findDuplicateLead(
    campaign.businessId,
    campaign.id,
    phone,
    new Date(Date.now() - DUPLICATE_WINDOW_MS),
  )
  if (duplicate) {
    logger.info("lead.enquiry_duplicate", {
      businessId: campaign.businessId,
      campaignId: campaign.id,
      leadId: duplicate.id,
    })
    return { reference: leadReference(duplicate.id), duplicate: true }
  }

  const created = await createLeadWithActivity({
    businessId: campaign.businessId,
    campaignId: campaign.id,
    name: data.name,
    phone,
    email: data.email ?? null,
    city: data.city ?? null,
    interestedIn: data.interestedIn ?? null,
    message: data.message ?? null,
    source: "CAMPAIGN_PAGE",
    status: "NEW",
    consentGiven: true,
    consentText: ENQUIRY_CONSENT_TEXT,
    utmSource: data.utmSource ?? null,
    utmMedium: data.utmMedium ?? null,
    utmCampaign: data.utmCampaign ?? null,
    utmTerm: data.utmTerm ?? null,
    utmContent: data.utmContent ?? null,
    visitorId: meta.visitorId ?? null,
    referrer: data.referrer ?? null,
    ipAddress: meta.ipAddress ?? null,
  })

  await recordFormSubmitEvent({
    campaignId: campaign.id,
    visitorId: meta.visitorId,
    referrer: data.referrer,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    utmSource: data.utmSource,
    utmMedium: data.utmMedium,
    utmCampaign: data.utmCampaign,
    utmTerm: data.utmTerm,
    utmContent: data.utmContent,
  }).catch((error) => {
    logger.warn("analytics.form_submit_failed", {
      leadId: created.id,
      campaignId: campaign.id,
      error: error instanceof Error ? error.message : String(error),
    })
  })

  await notifyManagers(campaign.businessId, {
    type: "LEAD_CREATED",
    title: `New enquiry from ${data.name}`,
    body: [campaign.name, data.city, data.interestedIn].filter(Boolean).join(" · "),
    linkUrl: `/dashboard/leads/${created.id}`,
  }).catch((error) => {
    logger.warn("lead.notification_failed", {
      leadId: created.id,
      error: error instanceof Error ? error.message : String(error),
    })
  })

  await recordAudit({
    actorId: null,
    businessId: campaign.businessId,
    action: "lead.created",
    entityType: "Lead",
    entityId: created.id,
    metadata: { campaignId: campaign.id, source: "CAMPAIGN_PAGE" },
    ipAddress: meta.ipAddress,
  })

  logger.info("lead.created", {
    businessId: campaign.businessId,
    campaignId: campaign.id,
    leadId: created.id,
  })

  return { reference: leadReference(created.id), duplicate: false }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getLeadList(
  context: BusinessContext,
  query: LeadListQuery,
): Promise<LeadListResult> {
  const options = resolveListOptions(context, query)
  const { rows, total } = await listLeads(context.businessId, {
    ...options,
    page: query.page,
    pageSize: query.pageSize,
  })
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))

  return {
    items: rows.map(toLeadListItem),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
  }
}

export async function getLeadDetail(
  context: BusinessContext,
  leadId: string,
): Promise<LeadDetail> {
  const lead = await loadLeadOrThrow(context, leadId)
  return toLeadDetail(lead)
}

export async function getLeadFilterOptions(
  context: BusinessContext,
): Promise<LeadFilterOptions> {
  const [members, campaigns] = await Promise.all([
    listAssignees(context.businessId),
    listCampaignOptions(context.businessId),
  ])

  return {
    assignees: members.flatMap((member) =>
      member.user ? [{ ...member.user, role: member.role }] : [],
    ),
    campaigns,
  }
}

// ---------------------------------------------------------------------------
// Status, assignment, notes, follow-ups
// ---------------------------------------------------------------------------

export async function updateLeadStatus(
  context: BusinessContext,
  leadId: string,
  input: unknown,
): Promise<LeadDetail> {
  const parsed = leadStatusUpdateSchema.parse(input)
  const lead = await loadLeadForEdit(context, leadId)

  if (lead.status === parsed.status) {
    if (parsed.note) {
      await updateLeadWithActivity(
        lead.id,
        {},
        { type: "NOTE_ADDED", actorId: context.userId, note: parsed.note },
      )
    }
    return getLeadDetail(context, lead.id)
  }

  const now = new Date()
  await updateLeadWithActivity(lead.id, statusUpdateFields(parsed.status, now), {
    type: "STATUS_CHANGED",
    actorId: context.userId,
    fromStatus: lead.status,
    toStatus: parsed.status,
    note: parsed.note ?? null,
  })

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "lead.status_changed",
    entityType: "Lead",
    entityId: lead.id,
    metadata: { from: lead.status, to: parsed.status },
  })

  logger.info("lead.status_changed", {
    businessId: context.businessId,
    leadId: lead.id,
    from: lead.status,
    to: parsed.status,
    actorId: context.userId,
  })

  return getLeadDetail(context, lead.id)
}

export async function assignLead(
  context: BusinessContext,
  leadId: string,
  input: unknown,
): Promise<LeadDetail> {
  assertCanAssign(context)
  const parsed = leadAssignSchema.parse(input)

  const lead = await findLeadForMutation(context.businessId, leadId)
  if (!lead) throw ApiError.notFound("Lead not found.")
  if (lead.assignedToId === parsed.userId) return getLeadDetail(context, lead.id)

  if (parsed.userId) {
    const assignee = await findActiveAssignee(context.businessId, parsed.userId)
    if (!assignee?.user) {
      throw ApiError.badRequest("invalid_assignee", "Choose a teammate from your business.")
    }
  }

  await updateLeadWithActivity(
    lead.id,
    { assignedToId: parsed.userId },
    {
      type: "ASSIGNED",
      actorId: context.userId,
      metadata: { fromUserId: lead.assignedToId, toUserId: parsed.userId },
    },
  )

  if (parsed.userId && parsed.userId !== context.userId) {
    await createNotification({
      userId: parsed.userId,
      businessId: context.businessId,
      type: "LEAD_ASSIGNED",
      title: "A lead was assigned to you",
      body: "Open the lead to see the customer details and next steps.",
      linkUrl: `/dashboard/leads/${lead.id}`,
    })
  }

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "lead.assigned",
    entityType: "Lead",
    entityId: lead.id,
    metadata: { fromUserId: lead.assignedToId, toUserId: parsed.userId },
  })

  logger.info("lead.assigned", {
    businessId: context.businessId,
    leadId: lead.id,
    toUserId: parsed.userId,
    actorId: context.userId,
  })

  return getLeadDetail(context, lead.id)
}

export async function addLeadNote(
  context: BusinessContext,
  leadId: string,
  input: unknown,
): Promise<LeadDetail> {
  const parsed = leadNoteSchema.parse(input)
  const lead = await loadLeadForEdit(context, leadId)

  await updateLeadWithActivity(
    lead.id,
    {},
    { type: "NOTE_ADDED", actorId: context.userId, note: parsed.note },
  )

  return getLeadDetail(context, lead.id)
}

export async function scheduleLeadFollowUp(
  context: BusinessContext,
  leadId: string,
  input: unknown,
): Promise<LeadDetail> {
  const parsed = leadFollowUpScheduleSchema.parse(input)
  const lead = await loadLeadForEdit(context, leadId)

  await updateLeadWithActivity(
    lead.id,
    { nextFollowUpAt: parsed.scheduledFor },
    {
      type: "FOLLOW_UP_SCHEDULED",
      actorId: context.userId,
      scheduledFor: parsed.scheduledFor,
      note: parsed.note ?? null,
    },
  )

  return getLeadDetail(context, lead.id)
}

export async function completeLeadFollowUp(
  context: BusinessContext,
  leadId: string,
  input: unknown,
): Promise<LeadDetail> {
  const parsed = leadFollowUpCompleteSchema.parse(input)
  const lead = await loadLeadForEdit(context, leadId)

  if (!lead.nextFollowUpAt) {
    throw ApiError.conflict(
      "no_follow_up",
      "No follow-up is scheduled for this lead. Schedule one first.",
    )
  }

  await updateLeadWithActivity(
    lead.id,
    { nextFollowUpAt: null, lastContactedAt: new Date() },
    {
      type: "FOLLOW_UP_COMPLETED",
      actorId: context.userId,
      scheduledFor: lead.nextFollowUpAt,
      note: parsed.note ?? null,
    },
  )

  return getLeadDetail(context, lead.id)
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

const EXPORT_HEADERS = [
  "Reference",
  "Name",
  "Phone",
  "Email",
  "City",
  "Interested in",
  "Status",
  "Source",
  "Campaign",
  "Assigned to",
  "Consent given",
  "Created at (UTC)",
  "Last contacted at (UTC)",
  "Next follow-up at (UTC)",
  "Converted at (UTC)",
  "Lost at (UTC)",
  "Message",
  "UTM source",
  "UTM medium",
  "UTM campaign",
] as const

function iso(value: Date | null): string {
  return value ? value.toISOString() : ""
}

export async function exportLeadsCsv(
  context: BusinessContext,
  query: LeadListQuery,
): Promise<LeadExportResult> {
  const options = resolveListOptions(context, query)
  const rows = await listLeadsForExport(context.businessId, options, LEAD_EXPORT_LIMIT + 1)

  if (rows.length > LEAD_EXPORT_LIMIT) {
    throw ApiError.badRequest(
      "export_too_large",
      `This export has more than ${LEAD_EXPORT_LIMIT.toLocaleString("en-IN")} leads. Narrow the filters and try again.`,
    )
  }

  const csv = buildCsv(
    EXPORT_HEADERS,
    rows.map((row) => [
      leadReference(row.id),
      row.name,
      row.phone,
      row.email,
      row.city,
      row.interestedIn,
      row.status,
      row.source,
      row.campaign?.name,
      row.assignedTo?.name,
      row.consentGiven ? "Yes" : "No",
      iso(row.createdAt),
      iso(row.lastContactedAt),
      iso(row.nextFollowUpAt),
      iso(row.convertedAt),
      iso(row.lostAt),
      row.message,
      row.utmSource,
      row.utmMedium,
      row.utmCampaign,
    ]),
  )

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "lead.exported",
    entityType: "Lead",
    metadata: {
      count: rows.length,
      filters: {
        status: query.status ?? null,
        campaignId: query.campaignId ?? null,
        assignedTo: query.assignedTo ?? null,
        search: query.search ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
      },
    },
  })

  logger.info("lead.exported", {
    businessId: context.businessId,
    actorId: context.userId,
    count: rows.length,
  })

  return {
    csv,
    filename: `leads-${new Date().toISOString().slice(0, 10)}.csv`,
    rowCount: rows.length,
  }
}
