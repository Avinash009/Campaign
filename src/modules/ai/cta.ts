import type { CtaType } from "@prisma/client"

/**
 * Maps free-text CTA wording from a language model onto the configured
 * `CtaType` enum. Pure module: safe to import from client components.
 */

const PHRASE_MATCHES: { pattern: RegExp; cta: CtaType }[] = [
  { pattern: /schedule (a )?(site )?visit|book (a )?(site )?visit|site visit/, cta: "SCHEDULE_VISIT" },
  { pattern: /appointment|book (a )?(call|slot|meeting)/, cta: "BOOK_APPOINTMENT" },
  { pattern: /callback|call back|request (a )?call/, cta: "REQUEST_CALLBACK" },
  { pattern: /quote|quotation|price estimate|cost estimate/, cta: "GET_QUOTE" },
  { pattern: /contact us|contact|reach us|get in touch/, cta: "CONTACT_US" },
  { pattern: /enquir|inquir|talk to us|learn more|know more|interested/, cta: "ENQUIRE_NOW" },
]

export function matchCtaType(value: string): CtaType | null {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
  if (!normalized) return null

  const asKey = value.trim().toUpperCase().replace(/[\s-]+/g, "_")
  if (
    asKey === "ENQUIRE_NOW" ||
    asKey === "CONTACT_US" ||
    asKey === "BOOK_APPOINTMENT" ||
    asKey === "REQUEST_CALLBACK" ||
    asKey === "GET_QUOTE" ||
    asKey === "SCHEDULE_VISIT"
  ) {
    return asKey
  }

  return PHRASE_MATCHES.find((entry) => entry.pattern.test(normalized))?.cta ?? null
}
