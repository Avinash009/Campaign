import type { LeadStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Prisma queries for the leads module. No business rules here — see
 * service.ts. Tenant-owned queries take `businessId` explicitly so cross-tenant
 * reads/writes are impossible by construction.
 */

export interface ListLeadsOptions {
  page: number
  pageSize: number
  status?: LeadStatus
  campaignId?: string
  assignedToId?: string
  unassignedOnly?: boolean
  search?: string
  /** Digits-only variant of the search term, matched against the stored phone. */
  searchPhone?: string
  from?: Date
  to?: Date
}

function buildLeadWhere(businessId: string, options: ListLeadsOptions): Prisma.LeadWhereInput {
  const search = options.search
  const searchPhone = options.searchPhone

  return {
    businessId,
    ...(options.status ? { status: options.status } : {}),
    ...(options.campaignId ? { campaignId: options.campaignId } : {}),
    ...(options.unassignedOnly
      ? { assignedToId: null }
      : options.assignedToId
        ? { assignedToId: options.assignedToId }
        : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { interestedIn: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } },
            ...(searchPhone && searchPhone.length >= 3
              ? [{ phone: { contains: searchPhone } }]
              : []),
          ],
        }
      : {}),
    ...(options.from || options.to
      ? {
          createdAt: {
            ...(options.from ? { gte: options.from } : {}),
            ...(options.to ? { lte: options.to } : {}),
          },
        }
      : {}),
  }
}

const leadListSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  city: true,
  interestedIn: true,
  status: true,
  source: true,
  createdAt: true,
  nextFollowUpAt: true,
  campaign: { select: { id: true, name: true, slug: true } },
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.LeadSelect

export async function listLeads(businessId: string, options: ListLeadsOptions) {
  const where = buildLeadWhere(businessId, options)
  const [rows, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      select: leadListSelect,
    }),
    prisma.lead.count({ where }),
  ])

  return { rows, total }
}

/** Export rows share the list filters but skip pagination. */
export function listLeadsForExport(
  businessId: string,
  options: Omit<ListLeadsOptions, "page" | "pageSize">,
  take: number,
) {
  return prisma.lead.findMany({
    where: buildLeadWhere(businessId, { ...options, page: 1, pageSize: take }),
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      city: true,
      interestedIn: true,
      message: true,
      status: true,
      source: true,
      consentGiven: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      lastContactedAt: true,
      nextFollowUpAt: true,
      convertedAt: true,
      lostAt: true,
      createdAt: true,
      campaign: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  })
}

export function findLeadById(businessId: string, leadId: string) {
  return prisma.lead.findFirst({
    where: { id: leadId, businessId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      city: true,
      interestedIn: true,
      message: true,
      status: true,
      source: true,
      assignedToId: true,
      consentGiven: true,
      consentText: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmTerm: true,
      utmContent: true,
      referrer: true,
      lastContactedAt: true,
      nextFollowUpAt: true,
      convertedAt: true,
      lostAt: true,
      createdAt: true,
      updatedAt: true,
      campaign: { select: { id: true, name: true, slug: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          scheduledFor: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
    },
  })
}

/** Minimal row used before mutating a lead (tenant-scoped). */
export function findLeadForMutation(businessId: string, leadId: string) {
  return prisma.lead.findFirst({
    where: { id: leadId, businessId },
    select: {
      id: true,
      status: true,
      assignedToId: true,
      nextFollowUpAt: true,
    },
  })
}

export function findDuplicateLead(
  businessId: string,
  campaignId: string,
  phone: string,
  since: Date,
) {
  return prisma.lead.findFirst({
    where: {
      businessId,
      campaignId,
      // Older rows (and the demo seed) store the `+91…` form; match both.
      phone: { in: [phone, `+${phone}`] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
}

/** Public lookup: only ACTIVE campaigns of ACTIVE businesses accept enquiries. */
export function findEnquiryCampaignBySlug(slug: string) {
  return prisma.campaign.findFirst({
    where: { slug, status: "ACTIVE", business: { status: "ACTIVE" } },
    select: {
      id: true,
      businessId: true,
      name: true,
      business: { select: { name: true } },
    },
  })
}

export type LeadActivityInput = Omit<Prisma.LeadActivityUncheckedCreateInput, "leadId">

export function createLeadWithActivity(
  data: Prisma.LeadUncheckedCreateInput,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data,
      select: { id: true },
    })
    await tx.leadActivity.create({
      data: { leadId: lead.id, type: "CREATED", toStatus: "NEW" },
    })
    return lead
  })
}

export async function updateLeadWithActivity(
  leadId: string,
  data: Prisma.LeadUncheckedUpdateInput,
  activity: LeadActivityInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data })
    await tx.leadActivity.create({ data: { ...activity, leadId } })
  })
}

export function listAssignees(businessId: string) {
  return prisma.businessMember.findMany({
    where: { businessId, status: "ACTIVE", userId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })
}

export function findActiveAssignee(businessId: string, userId: string) {
  return prisma.businessMember.findFirst({
    where: { businessId, userId, status: "ACTIVE" },
    select: { user: { select: { id: true, name: true, email: true } } },
  })
}

export function listCampaignOptions(businessId: string) {
  return prisma.campaign.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
  })
}
