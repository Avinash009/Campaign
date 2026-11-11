import { prisma } from "@/lib/prisma"

/**
 * Database-backed sliding-window rate limiting for public endpoints.
 * Works across server instances without Redis; rows are pruned opportunistically.
 *
 * Usage:
 *   const result = await checkRateLimit({ key: `enquiry:${ip}`, limit: 5, windowMs: HOUR })
 *   if (!result.allowed) throw ApiError.tooManyRequests(result.retryAfterSeconds)
 */

export interface RateLimitOptions {
  /** Dotted scope + identifier, e.g. "enquiry:203.0.113.9". */
  key: string
  /** Max allowed events inside the window (including this one). */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Remaining events after this one (0 when denied). */
  remaining: number
  /** Seconds until the window allows another attempt (0 when allowed). */
  retryAfterSeconds: number
}

export interface RateLimitDeps {
  now: () => number
  /** Count rows for `key` created after `since`. */
  countRecent: (key: string, since: Date) => Promise<number>
  /** Timestamp of the oldest matching row, or null when none. */
  oldestAt: (key: string, since: Date) => Promise<number | null>
  /** Record this attempt. */
  record: (key: string) => Promise<void>
  /** Best-effort cleanup of expired rows. */
  prune: (olderThan: Date) => Promise<void>
}

const defaultDeps: RateLimitDeps = {
  now: () => Date.now(),
  countRecent: (key, since) =>
    prisma.rateLimitLog.count({ where: { key, createdAt: { gt: since } } }),
  oldestAt: async (key, since) => {
    const row = await prisma.rateLimitLog.findFirst({
      where: { key, createdAt: { gt: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    })
    return row ? row.createdAt.getTime() : null
  },
  record: (key) => prisma.rateLimitLog.create({ data: { key } }).then(() => undefined),
  prune: (olderThan) =>
    prisma.rateLimitLog
      .deleteMany({ where: { createdAt: { lt: olderThan } } })
      .then(() => undefined),
}

/** Pure decision logic — unit tested separately from the database. */
export function evaluateRateLimit(input: {
  count: number
  limit: number
  windowMs: number
  now: number
  oldestAt: number | null
}): RateLimitResult {
  if (input.count >= input.limit) {
    const oldest = input.oldestAt
    const retryAfterMs =
      oldest !== null ? Math.max(0, oldest + input.windowMs - input.now) : input.windowMs
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }
  }
  return {
    allowed: true,
    remaining: Math.max(0, input.limit - input.count - 1),
    retryAfterSeconds: 0,
  }
}

export async function checkRateLimit(
  options: RateLimitOptions,
  deps: RateLimitDeps = defaultDeps,
): Promise<RateLimitResult> {
  const now = deps.now()
  const since = new Date(now - options.windowMs)

  const [count, oldest] = await Promise.all([deps.countRecent(options.key, since), deps.oldestAt(options.key, since)])

  const result = evaluateRateLimit({
    count,
    limit: options.limit,
    windowMs: options.windowMs,
    now,
    oldestAt: oldest,
  })

  if (result.allowed) {
    await deps.record(options.key)
    // Opportunistic cleanup (~5% of allowed calls) keeps the table small.
    if (Math.random() < 0.05) {
      await deps.prune(new Date(now - options.windowMs)).catch(() => undefined)
    }
  }

  return result
}
