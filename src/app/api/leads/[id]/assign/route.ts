import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { assignLead } from "@/modules/leads/service"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/leads/:id/assign — assign to a teammate or unassign (Owner/Admin). */
export const PATCH = routeHandler<RouteContext>(async (request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const lead = await assignLead(context, id, body)
  return NextResponse.json({ data: lead })
})
