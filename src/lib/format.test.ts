import { describe, expect, it } from "vitest"
import {
  formatDate,
  formatDateTime,
  formatPhone,
  phoneDigits,
  phoneTelHref,
  phoneWhatsAppHref,
} from "./format"

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

describe("phone helpers", () => {
  it("keeps digits only", () => {
    expect(phoneDigits("+91 98451-23456")).toBe("919845123456")
  })

  it("formats stored digits for display", () => {
    expect(formatPhone("919845123456")).toBe("+91 98451 23456")
    expect(formatPhone("9845123456")).toBe("+91 98451 23456")
    expect(formatPhone("+91 98451 23456")).toBe("+91 98451 23456")
    expect(formatPhone("")).toBe("")
  })

  it("builds click-to-call and WhatsApp links", () => {
    expect(phoneTelHref("919845123456")).toBe("tel:+919845123456")
    expect(phoneWhatsAppHref("919845123456")).toBe("https://wa.me/919845123456")
    expect(phoneWhatsAppHref("9845123456")).toBe("https://wa.me/919845123456")
  })
})
