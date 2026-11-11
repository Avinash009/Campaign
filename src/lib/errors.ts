import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { logger } from "@/lib/logger"

/**
 * Application error type thrown by services. Route handlers wrap their logic
 * in `routeHandler()` which converts ApiError (and ZodError) into the
 * standard JSON error envelope; unknown errors are sanitized to a 500.
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new ApiError(400, code, message, details)
  }
  static unauthorized(message = "You need to sign in to do that.") {
    return new ApiError(401, "unauthorized", message)
  }
  static forbidden(message = "You do not have permission to do that.") {
    return new ApiError(403, "forbidden", message)
  }
  static notFound(message = "Resource not found.") {
    return new ApiError(404, "not_found", message)
  }
  static conflict(code: string, message: string, details?: unknown) {
    return new ApiError(409, code, message, details)
  }
  static tooManyRequests(retryAfterSeconds: number) {
    return new ApiError(429, "rate_limited", "Too many requests. Please try again later.", {
      retryAfterSeconds,
    })
  }
  static serviceUnavailable(code: string, message: string) {
    return new ApiError(503, code, message)
  }
  static internal(message = "Something went wrong. Please try again.") {
    return new ApiError(500, "internal_error", message)
  }
}

interface ErrorEnvelope {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const body: ErrorEnvelope = {
      error: { code: error.code, message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) },
    }
    return NextResponse.json(body, { status: error.status })
  }

  if (error instanceof ZodError) {
    const body: ErrorEnvelope = {
      error: {
        code: "validation_failed",
        message: "Please check the highlighted fields and try again.",
        details: error.flatten().fieldErrors,
      },
    }
    return NextResponse.json(body, { status: 400 })
  }

  logger.error("unhandled_api_error", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  const body: ErrorEnvelope = {
    error: { code: "internal_error", message: "Something went wrong. Please try again." },
  }
  return NextResponse.json(body, { status: 500 })
}

/** Wraps a route handler with centralized error handling. */
export function routeHandler<C = unknown>(
  handler: (request: Request, context: C) => Promise<Response>,
): (request: Request, context: C) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return errorResponse(error)
    }
  }
}
