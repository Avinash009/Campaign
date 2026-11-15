import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiPlatformAdmin } from "@/modules/auth/session"
import { parseAdminBusinessListQuery } from "@/modules/admin/schemas"
import { getPlatformBusinessList } from "@/modules/admin/service"

/** GET /api/admin/businesses — paginated, searchable business directory. */
export const GET = routeHandler(async (request) => {
  await requireApiPlatformAdmin()
  const query = parseAdminBusinessListQuery(new URL(request.url).searchParams)
  const result = await getPlatformBusinessList(query)

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
