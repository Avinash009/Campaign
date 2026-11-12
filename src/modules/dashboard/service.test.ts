import { describe, expect, it } from "vitest"
import { parseDashboardPeriod, periodStart } from "./service"

describe("parseDashboardPeriod", () => {
  it("accepts the supported periods", () => {
    for (const period of ["7d", "30d", "90d", "all"] as const) {
      expect(parseDashboardPeriod(period)).toBe(period)
    }
  })

  it("falls back to all time for missing or unknown values", () => {
    expect(parseDashboardPeriod(undefined)).toBe("all")
    expect(parseDashboardPeriod("")).toBe("all")
    expect(parseDashboardPeriod("365d")).toBe("all")
  })

  it("uses the first value when the query param repeats", () => {
    expect(parseDashboardPeriod(["30d", "7d"])).toBe("30d")
  })
})

describe("periodStart", () => {
  const now = new Date("2026-11-11T12:00:00.000Z")

  it("returns the window start for day-based periods", () => {
    expect(periodStart("7d", now)?.toISOString()).toBe("2026-11-04T12:00:00.000Z")
    expect(periodStart("30d", now)?.toISOString()).toBe("2026-10-12T12:00:00.000Z")
    expect(periodStart("90d", now)?.toISOString()).toBe("2026-08-13T12:00:00.000Z")
  })

  it("returns null for all time", () => {
    expect(periodStart("all", now)).toBeNull()
  })
})
