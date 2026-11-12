/**
 * Request helpers used by route handlers (rate-limit keys, audit logs).
 * Behind Cloud Run / any reverse proxy the client IP arrives in
 * `x-forwarded-for`; we take the left-most entry. Never trust this value for
 * authorization — only for coarse rate limiting.
 */

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}
