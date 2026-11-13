import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { parseLeadListQuery } from "@/modules/leads/schemas"
import { getLeadList } from "@/modules/leads/service"

/** GET /api/leads — filtered, paginated lead list (role-scoped by the service). */
export const GET = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()
  const query = parseLeadListQuery(new URL(request.url).searchParams)
  const result = await getLeadList(context, query)

  return NextResponse.json({
    data: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
  })
})
