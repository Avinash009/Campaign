import { prisma } from "@/lib/prisma"

/**
 * Platform-admin statistics (cross-tenant by design — only reachable through
 * requirePlatformAdmin()). Full admin module arrives in Phase 6.
 */

export interface PlatformStatistics {
  totalBusinesses: number
  activeBusinesses: number
  totalUsers: number
  totalCampaigns: number
  activeCampaigns: number
  totalLeads: number
}

export async function getPlatformStatistics(): Promise<PlatformStatistics> {
  const [totalBusinesses, activeBusinesses, totalUsers, totalCampaigns, activeCampaigns, totalLeads] =
    await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count(),
    ])

  return { totalBusinesses, activeBusinesses, totalUsers, totalCampaigns, activeCampaigns, totalLeads }
}

export interface RecentBusiness {
  id: string
  name: string
  status: string
  industryName: string | null
  createdAt: Date
}

/** Newest registered businesses (cross-tenant by design — admin only). */
export async function getRecentBusinesses(take = 5): Promise<RecentBusiness[]> {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      industry: { select: { name: true } },
    },
  })
  return businesses.map((business) => ({
    id: business.id,
    name: business.name,
    status: business.status,
    createdAt: business.createdAt,
    industryName: business.industry?.name ?? null,
  }))
}
