import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { updateLeadStatus } from "@/modules/leads/service"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/leads/:id/status — status change with an optional note. */
export const PATCH = routeHandler<RouteContext>(async (request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const lead = await updateLeadStatus(context, id, body)
  return NextResponse.json({ data: lead })
})
