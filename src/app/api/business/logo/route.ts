import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireApiUser } from "@/modules/auth/session"
import {
  buildImageKey,
  getStorage,
  validateImageUpload,
} from "@/modules/storage"

const HOUR_MS = 60 * 60 * 1000

/**
 * POST /api/business/logo — multipart upload (field: `file`).
 * During onboarding the business does not exist yet, so files are stored under
 * the owner's user prefix; the returned URL is submitted with the onboarding
 * payload (validated to be an owned upload URL).
 */
export const POST = routeHandler(async (request) => {
  const session = await requireApiUser()
  const limit = await checkRateLimit({
    key: `logo-upload:${session.user.id}`,
    limit: 20,
    windowMs: HOUR_MS,
  })
  if (!limit.allowed) throw ApiError.tooManyRequests(limit.retryAfterSeconds)

  const formData = await request.formData().catch(() => null)
  const file = formData?.get("file")
  if (!(file instanceof File)) {
    throw ApiError.badRequest("missing_file", "Choose an image file to upload.")
  }

  validateImageUpload({ contentType: file.type, size: file.size })

  const buffer = Buffer.from(await file.arrayBuffer())
  const stored = await getStorage().upload({
    data: buffer,
    contentType: file.type,
    key: buildImageKey(`users/${session.user.id}/brand`, file.type),
  })

  return NextResponse.json({ logoUrl: stored.url })
})
