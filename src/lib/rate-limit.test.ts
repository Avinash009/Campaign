import { describe, expect, it, vi } from "vitest"
import { checkRateLimit, evaluateRateLimit, type RateLimitDeps } from "./rate-limit"

const MINUTE = 60 * 1000

describe("evaluateRateLimit (pure decision logic)", () => {
  it("allows a request below the limit and reports remaining quota", () => {
    const result = evaluateRateLimit({ count: 2, limit: 5, windowMs: MINUTE, now: 1000, oldestAt: 500 })
    expect(result).toEqual({ allowed: true, remaining: 2, retryAfterSeconds: 0 })
  })

  it("denies the request when the count reached the limit", () => {
    const result = evaluateRateLimit({ count: 5, limit: 5, windowMs: MINUTE, now: 1000, oldestAt: 500 })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("computes retry-after from the oldest entry in the window", () => {
    // oldest at t=0, window 60s, now t=25s → wait 35s
    const result = evaluateRateLimit({ count: 5, limit: 5, windowMs: MINUTE, now: 25_000, oldestAt: 0 })
    expect(result.retryAfterSeconds).toBe(35)
  })

  it("never reports a negative retry-after", () => {
    // oldest entry already outside the window edge
    const result = evaluateRateLimit({ count: 5, limit: 5, windowMs: MINUTE, now: 130_000, oldestAt: 0 })
    expect(result.retryAfterSeconds).toBe(0)
  })

  it("falls back to the full window when the oldest entry is unknown", () => {
    const result = evaluateRateLimit({ count: 5, limit: 5, windowMs: MINUTE, now: 1000, oldestAt: null })
    expect(result.retryAfterSeconds).toBe(60)
  })
})

function fakeDeps(overrides?: Partial<RateLimitDeps>): RateLimitDeps {
  return {
    now: () => 0,
    countRecent: vi.fn().mockResolvedValue(0),
    oldestAt: vi.fn().mockResolvedValue(null),
    record: vi.fn().mockResolvedValue(undefined),
    prune: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("checkRateLimit (with pluggable deps)", () => {
  it("records the attempt when allowed", async () => {
    const deps = fakeDeps()
    const result = await checkRateLimit({ key: "enquiry:1.2.3.4", limit: 5, windowMs: MINUTE }, deps)
    expect(result.allowed).toBe(true)
    expect(deps.record).toHaveBeenCalledWith("enquiry:1.2.3.4")
  })

  it("does not record when the limit is exceeded", async () => {
    const deps = fakeDeps({ countRecent: vi.fn().mockResolvedValue(5) })
    const result = await checkRateLimit({ key: "enquiry:1.2.3.4", limit: 5, windowMs: MINUTE }, deps)
    expect(result.allowed).toBe(false)
    expect(deps.record).not.toHaveBeenCalled()
  })

  it("denies with a retry-after derived from the oldest row", async () => {
    const now = 120_000
    const deps = fakeDeps({
      now: () => now,
      countRecent: vi.fn().mockResolvedValue(3),
      oldestAt: vi.fn().mockResolvedValue(80_000),
    })
    const result = await checkRateLimit({ key: "login:9.9.9.9", limit: 3, windowMs: MINUTE }, deps)
    expect(result.allowed).toBe(false)
    // oldest at t=80s + 60s window = t=140s; now=120s → 20s
    expect(result.retryAfterSeconds).toBe(20)
  })

  it("queries the window starting at now - windowMs", async () => {
    const countRecent = vi.fn().mockResolvedValue(0)
    const now = 600_000
    const deps = fakeDeps({ now: () => now, countRecent })
    await checkRateLimit({ key: "k", limit: 5, windowMs: MINUTE }, deps)
    const since = countRecent.mock.calls[0]?.[1] as Date
    expect(since.getTime()).toBe(now - MINUTE)
  })
})
