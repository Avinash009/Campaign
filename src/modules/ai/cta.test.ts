import { describe, expect, it } from "vitest"
import { matchCtaType } from "./cta"

describe("matchCtaType", () => {
  it("accepts configured enum keys in any casing or spacing", () => {
    expect(matchCtaType("ENQUIRE_NOW")).toBe("ENQUIRE_NOW")
    expect(matchCtaType("book appointment")).toBe("BOOK_APPOINTMENT")
    expect(matchCtaType("Request-Callback")).toBe("REQUEST_CALLBACK")
  })

  it("maps common button wording onto the configured types", () => {
    expect(matchCtaType("Enquire now")).toBe("ENQUIRE_NOW")
    expect(matchCtaType("Learn more")).toBe("ENQUIRE_NOW")
    expect(matchCtaType("Contact us today")).toBe("CONTACT_US")
    expect(matchCtaType("Book an appointment")).toBe("BOOK_APPOINTMENT")
    expect(matchCtaType("Request a callback")).toBe("REQUEST_CALLBACK")
    expect(matchCtaType("Get a quote")).toBe("GET_QUOTE")
    expect(matchCtaType("Schedule a site visit")).toBe("SCHEDULE_VISIT")
    expect(matchCtaType("Book a site visit")).toBe("SCHEDULE_VISIT")
  })

  it("prefers the site-visit match over the generic appointment match", () => {
    expect(matchCtaType("Book a site visit appointment")).toBe("SCHEDULE_VISIT")
  })

  it("returns null when the wording has no safe match", () => {
    expect(matchCtaType("")).toBeNull()
    expect(matchCtaType("Talk to our team")).toBeNull()
    expect(matchCtaType("Download the brochure")).toBeNull()
  })
})
