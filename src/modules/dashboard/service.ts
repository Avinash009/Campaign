import { prisma } from "@/lib/prisma"

/**
 * Dashboard aggregate queries. All counts are scoped by businessId —
 * tenant isolation is non-negotiable (see AGENTS.md rule 3).
 */

export interface DashboardSummary {
  totalCampaigns: number
  activeCampaigns: number
  totalLeads: number
  newLeads: number
  qualifiedLeads: number
  convertedLeads: number
}

export async function getDashboardSummary(businessId: string): Promise<DashboardSummary> {
  const [totalCampaigns, activeCampaigns, totalLeads, newLeads, qualifiedLeads, convertedLeads] =
    await Promise.all([
      prisma.campaign.count({ where: { businessId } }),
      prisma.campaign.count({ where: { businessId, status: "ACTIVE" } }),
      prisma.lead.count({ where: { businessId } }),
      prisma.lead.count({ where: { businessId, status: "NEW" } }),
      prisma.lead.count({ where: { businessId, status: "QUALIFIED" } }),
      prisma.lead.count({ where: { businessId, status: "CONVERTED" } }),
    ])

  return { totalCampaigns, activeCampaigns, totalLeads, newLeads, qualifiedLeads, convertedLeads }
}

export async function getRecentCampaigns(businessId: string, take = 5) {
  return prisma.campaign.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      industry: { select: { name: true } },
    },
  })
}

export async function getRecentLeads(businessId: string, take = 5) {
  return prisma.lead.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      phone: true,
      city: true,
      status: true,
      createdAt: true,
      campaign: { select: { name: true } },
    },
  })
}
