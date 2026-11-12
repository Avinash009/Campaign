import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { addCampaignImages } from "@/modules/campaigns/service"

type RouteContext = { params: Promise<{ id: string }> }

const HOUR_MS = 60 * 60 * 1000

/** POST /api/campaigns/:id/images — multipart upload, field `images` (repeatable). */
export const POST = routeHandler<RouteContext>(async (request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params

  const limit = await checkRateLimit({
    key: `campaign-image-upload:${context.businessId}`,
    limit: 60,
    windowMs: HOUR_MS,
  })
  if (!limit.allowed) throw ApiError.tooManyRequests(limit.retryAfterSeconds)

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    throw ApiError.badRequest("invalid_form_data", "Send the images as multipart form data.")
  }

  const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File)

  const images = await addCampaignImages(context, id, files, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json({ data: images }, { status: 201 })
})
