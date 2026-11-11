import { afterEach, describe, expect, it, vi } from "vitest"

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.resetModules()
  vi.restoreAllMocks()
})

describe("getEnv", () => {
  it("validates and applies defaults", async () => {
    const { getEnv } = await import("@/lib/env")
    const env = getEnv()
    expect(env.DATABASE_URL).toBe(process.env.DATABASE_URL)
    expect(env.APP_URL).toBe("http://localhost:3000")
    expect(env.LOG_LEVEL).toBe("info")
    expect(env.STORAGE_DRIVER).toBe("local")
  })

  it("fails fast with a clear message when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL
    const { getEnv } = await import("@/lib/env")
    expect(() => getEnv()).toThrow(/DATABASE_URL/)
  })

  it("fails fast when AUTH_SECRET is too short", async () => {
    process.env.AUTH_SECRET = "short"
    const { getEnv } = await import("@/lib/env")
    expect(() => getEnv()).toThrow(/AUTH_SECRET/)
  })

  it("rejects an unknown storage driver", async () => {
    process.env.STORAGE_DRIVER = "ftp"
    const { getEnv } = await import("@/lib/env")
    expect(() => getEnv()).toThrow(/STORAGE_DRIVER/)
  })
})
