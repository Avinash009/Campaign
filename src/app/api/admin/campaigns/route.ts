import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiPlatformAdmin } from "@/modules/auth/session"
import { parseAdminCampaignListQuery } from "@/modules/admin/schemas"
import { getPlatformCampaignList } from "@/modules/admin/service"

/** GET /api/admin/campaigns — cross-tenant campaign monitoring list. */
export const GET = routeHandler(async (request) => {
  await requireApiPlatformAdmin()
  const query = parseAdminCampaignListQuery(new URL(request.url).searchParams)
  const result = await getPlatformCampaignList(query)

  return NextResponse.json({
    data: result.items,
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
  })
})
