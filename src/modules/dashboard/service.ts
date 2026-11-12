import { prisma } from "@/lib/prisma"

/**
 * Dashboard aggregate queries. All counts are scoped by businessId —
 * tenant isolation is non-negotiable (see AGENTS.md rule 3).
 */

export const DASHBOARD_PERIODS = ["7d", "30d", "90d", "all"] as const
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
}

/** Normalizes `?period=` from the URL; unknown values fall back to all time. */
export function parseDashboardPeriod(value: string | string[] | undefined): DashboardPeriod {
  const candidate = Array.isArray(value) ? value[0] : value
  return DASHBOARD_PERIODS.find((period) => period === candidate) ?? "all"
}

/** Start of the selected window, or null for all time. */
export function periodStart(period: DashboardPeriod, now: Date = new Date()): Date | null {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : null
  if (days === null) return null
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export interface DashboardSummary {
  totalCampaigns: number
  activeCampaigns: number
  totalLeads: number
  newLeads: number
  qualifiedLeads: number
  convertedLeads: number
}

export async function getDashboardSummary(
  businessId: string,
  period: DashboardPeriod = "all",
): Promise<DashboardSummary> {
  const since = periodStart(period)
  const createdAt = since ? { gte: since } : undefined
  const scoped = { businessId, ...(createdAt ? { createdAt } : {}) }

  const [totalCampaigns, activeCampaigns, totalLeads, newLeads, qualifiedLeads, convertedLeads] =
    await Promise.all([
      prisma.campaign.count({ where: scoped }),
      prisma.campaign.count({ where: { ...scoped, status: "ACTIVE" } }),
      prisma.lead.count({ where: scoped }),
      prisma.lead.count({ where: { ...scoped, status: "NEW" } }),
      prisma.lead.count({ where: { ...scoped, status: "QUALIFIED" } }),
      prisma.lead.count({ where: { ...scoped, status: "CONVERTED" } }),
    ])

  return { totalCampaigns, activeCampaigns, totalLeads, newLeads, qualifiedLeads, convertedLeads }
}

export async function getRecentCampaigns(
  businessId: string,
  options: { period?: DashboardPeriod; take?: number } = {},
) {
  const since = periodStart(options.period ?? "all")
  return prisma.campaign.findMany({
    where: { businessId, ...(since ? { createdAt: { gte: since } } : {}) },
    orderBy: { createdAt: "desc" },
    take: options.take ?? 5,
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

export async function getRecentLeads(
  businessId: string,
  options: { period?: DashboardPeriod; take?: number } = {},
) {
  const since = periodStart(options.period ?? "all")
  return prisma.lead.findMany({
    where: { businessId, ...(since ? { createdAt: { gte: since } } : {}) },
    orderBy: { createdAt: "desc" },
    take: options.take ?? 5,
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
