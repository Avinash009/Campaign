import { describe, expect, it } from "vitest"
import { ApiError } from "@/lib/errors"
import {
  normalizeGeneratedCopy,
  normalizeLandingContent,
  parseJsonFromText,
} from "./parsing"

function errorCode(fn: () => unknown): string | null {
  try {
    fn()
    return null
  } catch (error) {
    return error instanceof ApiError ? error.code : "unexpected"
  }
}

describe("parseJsonFromText", () => {
  it("parses a plain JSON object", () => {
    expect(parseJsonFromText('{"headline":"Hi"}')).toEqual({ headline: "Hi" })
  })

  it("unwraps markdown fences", () => {
    expect(parseJsonFromText('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseJsonFromText("```\n{\"a\":2}\n```")).toEqual({ a: 2 })
  })

  it("ignores commentary around the object", () => {
    expect(parseJsonFromText('Sure! {"a":{"b":2}} Hope that helps.')).toEqual({ a: { b: 2 } })
  })

  it("raises ai_invalid_response for unreadable text", () => {
    expect(errorCode(() => parseJsonFromText("not json at all"))).toBe("ai_invalid_response")
  })
})

describe("normalizeGeneratedCopy", () => {
  it("accepts singular alias keys and trims values", () => {
    const copy = normalizeGeneratedCopy({
      headline: ["  Spacious 3 BHK homes  "],
      description: ["Clubhouse, parking and 24x7 security."],
      ctas: ["Enquire now", "Book a site visit"],
    })

    expect(copy.headlines).toEqual(["Spacious 3 BHK homes"])
    expect(copy.descriptions).toEqual(["Clubhouse, parking and 24x7 security."])
    expect(copy.suggestedCtas).toEqual(["Enquire now", "Book a site visit"])
  })

  it("removes duplicates and ignores non-string entries", () => {
    const copy = normalizeGeneratedCopy({
      headlines: ["Homes in Kondapur", "homes in kondapur", 42, ""],
      descriptions: ["A", "A"],
      suggestedCtas: ["Enquire now"],
    })

    expect(copy.headlines).toHaveLength(1)
    expect(copy.descriptions).toHaveLength(1)
  })

  it("caps the number of items", () => {
    const copy = normalizeGeneratedCopy({
      headlines: Array.from({ length: 12 }, (_, index) => `Headline ${index}`),
      descriptions: ["One description"],
      suggestedCtas: ["Enquire now"],
    })

    expect(copy.headlines).toHaveLength(5)
  })

  it("rejects a response without usable copy", () => {
    expect(errorCode(() => normalizeGeneratedCopy({}))).toBe("ai_invalid_response")
    expect(errorCode(() => normalizeGeneratedCopy("nope"))).toBe("ai_invalid_response")
  })
})

describe("normalizeLandingContent", () => {
  it("maps alias keys and matches the suggested CTA", () => {
    const content = normalizeLandingContent({
      title: "Homes in Kondapur",
      promo_description: "Move-in ready apartments.",
      product_details: "3 BHK with clubhouse.",
      offer: "Pre-launch price",
      cta: "Book a site visit",
    })

    expect(content.headline).toBe("Homes in Kondapur")
    expect(content.promoDescription).toBe("Move-in ready apartments.")
    expect(content.productDetails).toBe("3 BHK with clubhouse.")
    expect(content.offerDetails).toBe("Pre-launch price")
    expect(content.suggestedCta).toBe("SCHEDULE_VISIT")
    expect(content.suggestedCtaLabel).toBe("Book a site visit")
  })

  it("keeps unmapped CTA wording as a label with a null type", () => {
    const content = normalizeLandingContent({
      headline: "Homes in Kondapur",
      promoDescription: "Move-in ready apartments.",
      suggestedCta: "Download the brochure",
    })

    expect(content.suggestedCta).toBeNull()
    expect(content.suggestedCtaLabel).toBe("Download the brochure")
  })

  it("rejects a response without a headline and description", () => {
    expect(errorCode(() => normalizeLandingContent({ headline: "" }))).toBe(
      "ai_invalid_response",
    )
  })
})
