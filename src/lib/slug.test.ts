import { describe, expect, it, vi } from "vitest"
import { candidateSlugs, slugify, uniqueSlug } from "./slug"

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Luxury Apartments in Hyderabad")).toBe("luxury-apartments-in-hyderabad")
  })

  it("strips punctuation and special characters", () => {
    expect(slugify("Monsoon offer — 50% OFF!!")).toBe("monsoon-offer-50-off")
    expect(slugify("Bengaluru's finest cafés")).toBe("bengalurus-finest-cafes")
  })

  it("collapses repeated separators and trims them", () => {
    expect(slugify("  ---multiple   spaces---  ")).toBe("multiple-spaces")
  })

  it("caps length at 80 characters", () => {
    const long = "a".repeat(200)
    expect(slugify(long)).toHaveLength(80)
  })

  it("returns an empty string for symbol-only input", () => {
    expect(slugify("!!! ??? ***")).toBe("")
  })
})

describe("candidateSlugs", () => {
  it("yields the stem first, then numbered suffixes", () => {
    const candidates = [...candidateSlugs("New Offer!")]
    expect(candidates[0]).toBe("new-offer")
    expect(candidates[1]).toBe("new-offer-2")
    expect(candidates[2]).toBe("new-offer-3")
  })

  it("falls back to a generic stem for empty slugs", () => {
    expect([...candidateSlugs("!!!")][0]).toBe("item")
  })
})

describe("uniqueSlug", () => {
  it("returns the base slug when it is free", async () => {
    const isTaken = vi.fn().mockResolvedValue(false)
    await expect(uniqueSlug("My Campaign", isTaken)).resolves.toBe("my-campaign")
    expect(isTaken).toHaveBeenCalledTimes(1)
  })

  it("takes the first available numbered suffix", async () => {
    const isTaken = vi.fn().mockImplementation(async (slug: string) => slug !== "my-campaign-3")
    await expect(uniqueSlug("My Campaign", isTaken)).resolves.toBe("my-campaign-3")
    expect(isTaken).toHaveBeenCalledTimes(3)
  })
})
