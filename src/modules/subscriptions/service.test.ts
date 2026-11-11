import { describe, expect, it } from "vitest"
import { formatInr } from "./service"

describe("formatInr (integer paise → display text)", () => {
  it("formats whole rupees", () => {
    expect(formatInr(99900)).toBe("₹999")
    expect(formatInr(599900)).toBe("₹5,999")
  })

  it("uses Indian digit grouping (lakh/crore)", () => {
    expect(formatInr(249900)).toBe("₹2,499")
    expect(formatInr(123456700)).toBe("₹12,34,567")
  })

  it("handles zero", () => {
    expect(formatInr(0)).toBe("₹0")
  })
})
