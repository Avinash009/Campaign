import { describe, expect, it } from "vitest"
import { ApiError, errorResponse } from "./errors"

describe("ApiError", () => {
  it("carries status, code and message", () => {
    const error = ApiError.notFound("Campaign not found.")
    expect(error.status).toBe(404)
    expect(error.code).toBe("not_found")
    expect(error.message).toBe("Campaign not found.")
  })

  it("maps rate limiting with retry details", () => {
    const error = ApiError.tooManyRequests(42)
    expect(error.status).toBe(429)
    expect(error.details).toEqual({ retryAfterSeconds: 42 })
  })
})

describe("errorResponse", () => {
  it("serializes ApiError into the JSON envelope", async () => {
    const response = errorResponse(ApiError.forbidden("Members cannot invite users."))
    expect(response.status).toBe(403)
    const body = (await response.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe("forbidden")
    expect(body.error.message).toBe("Members cannot invite users.")
  })

  it("sanitizes unknown errors to a generic 500", async () => {
    const response = errorResponse(new Error("DB password is hunter2"))
    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe("internal_error")
    expect(JSON.stringify(body)).not.toContain("hunter2")
  })
})
