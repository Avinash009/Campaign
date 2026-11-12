import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { getTeamOverview } from "@/modules/business/service"

/** GET /api/business/team — members + seats (any active member may view). */
export const GET = routeHandler(async () => {
  const context = await requireApiBusinessContext()
  const overview = await getTeamOverview(context.businessId)
  return NextResponse.json({ data: overview })
})
