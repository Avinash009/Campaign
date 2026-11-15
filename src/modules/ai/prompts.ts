import type { AiContentInput, AiLandingContentInput } from "./index"
import { AI_TONE_LABELS, type AiTone } from "./schemas"

/**
 * Prompt builders for the LLM-backed content features.
 *
 * Pure functions so they can be unit-tested without a provider. The system
 * message carries the honest-output rules: no invented statistics, awards,
 * guarantees or customer quotes, and no claims about ad-platform publishing.
 */

export interface AiPrompt {
  system: string
  user: string
  maxTokens: number
}

const SYSTEM_PROMPT = `You write short advertising copy for Indian small businesses.
Rules:
- Use clear Indian English and sentence case.
- Never invent statistics, awards, customer names, testimonials or guarantees.
- Never claim the business will publish ads on Google or Meta.
- Use only the facts supplied by the user. If a detail is missing, leave it out.
- Keep claims accurate and easy to verify.
- Return only a JSON object with the exact keys requested. No markdown, no commentary.`

const TONE_GUIDANCE: Record<AiTone, string> = {
  professional: "Calm, credible and factual.",
  friendly: "Warm, conversational and approachable.",
  urgent: "Direct and time-aware, but never pushy or misleading.",
}

function formatFacts(facts: Record<string, string | undefined>): string {
  return Object.entries(facts)
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([key, value]) => `- ${key}: ${value?.trim()}`)
    .join("\n")
}

export function buildAdCopyPrompt(input: AiContentInput): AiPrompt {
  const tone = input.tone ?? "professional"
  const facts = formatFacts({
    "Business name": input.businessName,
    Industry: input.industryName,
    "Product or service details": input.productDetails,
    "Offer details": input.offerDetails,
    "Target audience": input.targetAudience,
  })

  return {
    system: SYSTEM_PROMPT,
    maxTokens: 900,
    user: `Write advertising copy for this business.

${facts}

Tone: ${AI_TONE_LABELS[tone]} — ${TONE_GUIDANCE[tone]}

Return JSON with exactly these keys:
{
  "headlines": [3 to 5 short headlines, each at most 120 characters],
  "descriptions": [2 to 4 short paragraphs, each at most 220 words],
  "suggestedCtas": [2 to 4 button labels, each at most 40 characters]
}`,
  }
}

export function buildLandingContentPrompt(input: AiLandingContentInput): AiPrompt {
  const tone = input.tone ?? "professional"
  const facts = formatFacts({
    "Business name": input.businessName,
    Industry: input.industryName,
    "Campaign name": input.campaignName,
    "Product or service details": input.productDetails,
    "Offer details": input.offerDetails,
    "Target audience": input.targetAudience,
    "Target location": input.targetLocation,
    "Price display": input.priceDisplay,
  })

  return {
    system: SYSTEM_PROMPT,
    maxTokens: 1200,
    user: `Write landing-page content for this campaign.

${facts}

Tone: ${AI_TONE_LABELS[tone]} — ${TONE_GUIDANCE[tone]}

Return JSON with exactly these keys:
{
  "headline": "one headline, at most 120 characters",
  "promoDescription": "one or two short paragraphs, at most 220 words",
  "productDetails": "a short factual paragraph, at most 220 words",
  "offerDetails": "a short factual sentence about the offer, or an empty string",
  "suggestedCta": "one button label, at most 40 characters"
}`,
  }
}
