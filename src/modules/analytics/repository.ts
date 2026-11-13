import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Prisma queries for analytics. Every read is scoped through the campaign or
 * lead `businessId` — CampaignEvent itself has no tenant column, so the
 * relation filter is the isolation boundary.
 */

export interface AnalyticsRange {
  since: Date | null
  until: Date
  campaignId?: string
}

export function listAnalyticsCampaigns(businessId: string) {
  return prisma.campaign.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slug: true, status: true },
  })
}

export function listPageViewEvents(businessId: string, range: AnalyticsRange) {
  return prisma.campaignEvent.findMany({
    where: {
      type: "PAGE_VIEW",
      occurredAt: {
        ...(range.since ? { gte: range.since } : {}),
        lte: range.until,
      },
      campaign: {
        businessId,
        ...(range.campaignId ? { id: range.campaignId } : {}),
      },
    },
    orderBy: { occurredAt: "asc" },
    select: { campaignId: true, visitorId: true, occurredAt: true },
  })
}

export function listAnalyticsLeads(businessId: string, range: AnalyticsRange) {
  return prisma.lead.findMany({
    where: {
      businessId,
      createdAt: {
        ...(range.since ? { gte: range.since } : {}),
        lte: range.until,
      },
      ...(range.campaignId ? { campaignId: range.campaignId } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { campaignId: true, city: true, status: true, createdAt: true },
  })
}

/** Public beacon lookup: only ACTIVE campaigns of ACTIVE businesses count. */
export function findActiveCampaignIdBySlug(slug: string) {
  return prisma.campaign.findFirst({
    where: { slug, status: "ACTIVE", business: { status: "ACTIVE" } },
    select: { id: true },
  })
}

export function createCampaignEventRecord(data: Prisma.CampaignEventUncheckedCreateInput) {
  return prisma.campaignEvent.create({ data, select: { id: true } })
}
