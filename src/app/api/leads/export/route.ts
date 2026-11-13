import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { parseLeadListQuery } from "@/modules/leads/schemas"
import { exportLeadsCsv } from "@/modules/leads/service"

/**
 * GET /api/leads/export — CSV export with the same filters as the list.
 * Capped at 5,000 rows; broader filters return a friendly 400 instead of a
 * partial file.
 */
export const GET = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()
  const query = parseLeadListQuery(new URL(request.url).searchParams)
  const { csv, filename, rowCount } = await exportLeadsCsv(context, query)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Lead-Count": String(rowCount),
    },
  })
})
