import { describe, expect, it } from "vitest"
import { formatDate, formatDateTime } from "./format"

describe("formatDate", () => {
  it("formats a UTC instant in IST with en-IN style", () => {
    // 2026-11-11T06:30:00Z is 12:00 IST on 11 Nov 2026
    const date = new Date("2026-11-11T06:30:00Z")
    expect(formatDate(date)).toBe("11 Nov 2026")
  })

  it("keeps the previous day for late-evening UTC instants", () => {
    // 2026-11-11T20:00:00Z is 01:30 IST on 12 Nov 2026
    const date = new Date("2026-11-11T20:00:00Z")
    expect(formatDate(date)).toBe("12 Nov 2026")
  })
})

describe("formatDateTime", () => {
  it("includes the IST time of day", () => {
    const date = new Date("2026-11-11T06:30:00Z")
    const formatted = formatDateTime(date)
    expect(formatted.startsWith("11 Nov 2026,")).toBe(true)
    expect(formatted).toContain("12:00")
    expect(formatted).toMatch(/(am|pm)/i)
  })
})
