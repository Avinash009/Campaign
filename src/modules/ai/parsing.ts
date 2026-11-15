import { ApiError } from "@/lib/errors"
import { matchCtaType } from "./cta"
import type { AiGeneratedCopy, AiGeneratedLandingContent } from "./index"
import {
  generatedCopySchema,
  generatedLandingContentSchema,
} from "./schemas"

/**
 * Provider-response parsing and normalisation (server-only).
 *
 * Models occasionally add markdown fences, wrapper objects or alias keys. We
 * extract the JSON object, accept the common aliases, then validate the result
 * with Zod. Anything unusable becomes an explicit `ai_invalid_response` error —
 * never an empty or partially invented result.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Extracts the first JSON object from a model reply, tolerating ```json fences. */
export function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  const first = withoutFence.indexOf("{")
  const last = withoutFence.lastIndexOf("}")
  const candidate =
    first !== -1 && last > first ? withoutFence.slice(first, last + 1) : withoutFence

  try {
    return JSON.parse(candidate) as unknown
  } catch {
    throw ApiError.serviceUnavailable(
      "ai_invalid_response",
      "The AI provider returned an unreadable response. Please try again.",
    )
  }
}

function toStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of value) {
    if (typeof item !== "string") continue
    const trimmed = item.replace(/\s+/g, " ").trim().slice(0, maxLength).trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
    if (result.length >= maxItems) break
  }

  return result
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key]
  }
  return undefined
}

export function normalizeGeneratedCopy(raw: unknown): AiGeneratedCopy {
  if (!isRecord(raw)) {
    throw ApiError.serviceUnavailable(
      "ai_invalid_response",
      "The AI provider did not return the expected copy. Please try again.",
    )
  }

  const candidate = {
    headlines: toStringList(pick(raw, ["headlines", "headline"]), 5, 160),
    descriptions: toStringList(pick(raw, ["descriptions", "description"]), 4, 2000),
    suggestedCtas: toStringList(
      pick(raw, ["suggestedCtas", "suggested_ctas", "ctas", "callsToAction", "callToActions"]),
      5,
      60,
    ),
  }

  const parsed = generatedCopySchema.safeParse(candidate)
  if (!parsed.success) {
    throw ApiError.serviceUnavailable(
      "ai_invalid_response",
      "The AI provider did not return enough usable copy. Please try again.",
    )
  }

  return parsed.data
}

export function normalizeLandingContent(raw: unknown): AiGeneratedLandingContent {
  if (!isRecord(raw)) {
    throw ApiError.serviceUnavailable(
      "ai_invalid_response",
      "The AI provider did not return the expected landing-page content. Please try again.",
    )
  }

  const candidate = {
    headline: pick(raw, ["headline", "title"]),
    promoDescription: pick(raw, ["promoDescription", "promo_description", "description"]),
    productDetails: pick(raw, ["productDetails", "product_details", "details"]),
    offerDetails: pick(raw, ["offerDetails", "offer_details", "offer"]),
    suggestedCta: pick(raw, ["suggestedCta", "suggested_cta", "cta"]),
  }

  const parsed = generatedLandingContentSchema.safeParse(candidate)
  if (!parsed.success) {
    throw ApiError.serviceUnavailable(
      "ai_invalid_response",
      "The AI provider did not return a usable headline and description. Please try again.",
    )
  }

  const ctaLabel = parsed.data.suggestedCta.trim()
  return {
    ...parsed.data,
    suggestedCta: ctaLabel ? matchCtaType(ctaLabel) : null,
    suggestedCtaLabel: ctaLabel,
  }
}
