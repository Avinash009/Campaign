import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiPlatformAdmin } from "@/modules/auth/session"
import { getPlatformStatistics } from "@/modules/admin/service"

/** GET /api/admin/statistics — cross-tenant platform totals (admin only). */
export const GET = routeHandler(async () => {
  await requireApiPlatformAdmin()
  const statistics = await getPlatformStatistics()
  return NextResponse.json({ data: statistics })
})
