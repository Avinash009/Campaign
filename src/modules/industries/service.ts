import { prisma } from "@/lib/prisma"

/**
 * Industry catalog (tenant-shared reference data). Industries are database
 * rows — adding one never requires code changes (see docs/PRD.md §3).
 */

export interface IndustrySummary {
  id: string
  slug: string
  name: string
  description: string | null
  iconKey: string | null
}

export async function getActiveIndustries(): Promise<IndustrySummary[]> {
  const industries = await prisma.industry.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, description: true, iconKey: true },
  })
  return industries
}
