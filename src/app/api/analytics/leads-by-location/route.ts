import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { parseAnalyticsQuery } from "@/modules/analytics/schemas"
import { getAnalyticsOverview } from "@/modules/analytics/service"

/** GET /api/analytics/leads-by-location — enquiry counts grouped by city. */
export const GET = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()
  const query = parseAnalyticsQuery(new URL(request.url).searchParams)
  const overview = await getAnalyticsOverview(context, query)

  return NextResponse.json({
    data: overview.locations,
    meta: {
      period: overview.period,
      campaignId: overview.campaignId ?? null,
      total: overview.summary.enquiries,
    },
  })
})
