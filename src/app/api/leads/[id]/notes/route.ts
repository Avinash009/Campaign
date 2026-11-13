import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { addLeadNote } from "@/modules/leads/service"

type RouteContext = { params: Promise<{ id: string }> }

/** POST /api/leads/:id/notes — append a note to the lead timeline. */
export const POST = routeHandler<RouteContext>(async (request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const lead = await addLeadNote(context, id, body)
  return NextResponse.json({ data: lead }, { status: 201 })
})
