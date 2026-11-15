import type {
  AiLeadQualification,
  AiLeadQualificationInput,
  AiLeadScoringService,
} from "./index"

/**
 * Transparent, deterministic lead qualification.
 *
 * Every point is explained in `reasons`. There is no model call and no hidden
 * weight: the same input always produces the same score. The UI labels this as
 * rule-based so nobody mistakes it for a prediction.
 */

const BASE_SCORE = 10
const HOT_THRESHOLD = 65
const WARM_THRESHOLD = 40

const INTENT_PATTERNS: RegExp[] = [
  /\burgent(ly)?\b/,
  /\bimmediate(ly)?\b/,
  /\basap\b/,
  /\bready to\b/,
  /\bsite visit\b/,
  /\bvisit\b/,
  /\bbudget\b/,
  /\bprice(s)?\b/,
  /\bquote\b/,
  /\bappointment\b/,
  /\bcall me\b/,
  /\binterested\b/,
]

const STATUS_POINTS = {
  NEW: 0,
  CONTACTED: 6,
  INTERESTED: 10,
  QUALIFIED: 15,
  CONVERTED: 15,
  LOST: -20,
} as const

const SOURCE_POINTS = {
  REFERRAL: 8,
  CAMPAIGN_PAGE: 5,
  DIRECT: 3,
  ORGANIC: 3,
  SOCIAL: 2,
  EMAIL: 2,
  OTHER: 0,
} as const

const STATUS_REASONS = {
  NEW: null,
  CONTACTED: "The team has already contacted this lead (+6).",
  INTERESTED: "The lead has shown interest (+10).",
  QUALIFIED: "The lead is marked qualified (+15).",
  CONVERTED: "The lead already converted (+15).",
  LOST: "The lead is marked lost, so it is deprioritised (-20).",
} as const

function countIntentSignals(text: string): number {
  const normalized = text.toLowerCase()
  return INTENT_PATTERNS.reduce(
    (count, pattern) => (pattern.test(normalized) ? count + 1 : count),
    0,
  )
}

function messagePoints(length: number): number {
  if (length >= 80) return 15
  if (length >= 30) return 10
  if (length >= 10) return 5
  return 0
}

export function qualifyLead(input: AiLeadQualificationInput): AiLeadQualification {
  const reasons: string[] = [`Base score for a genuine enquiry (${BASE_SCORE}).`]
  let score = BASE_SCORE

  if (input.consentGiven) {
    score += 10
    reasons.push("The customer consented to be contacted (+10).")
  }

  if (input.email?.trim()) {
    score += 5
    reasons.push("A workable email address was shared (+5).")
  }

  if (input.city?.trim()) {
    score += 5
    reasons.push("A city or service area was shared (+5).")
  }

  if (input.interestedIn?.trim()) {
    score += 10
    reasons.push("The customer named what they are interested in (+10).")
  }

  const messageLength = input.message?.trim().length ?? 0
  const points = messagePoints(messageLength)
  if (points > 0) {
    score += points
    reasons.push(`The message has ${messageLength} characters of context (+${points}).`)
  }

  const intentCount = countIntentSignals(
    `${input.message ?? ""} ${input.interestedIn ?? ""}`,
  )
  const intentPoints = Math.min(12, intentCount * 4)
  if (intentPoints > 0) {
    score += intentPoints
    reasons.push(`Buying-intent wording appeared ${intentCount} time(s) (+${intentPoints}).`)
  }

  const sourcePoints = SOURCE_POINTS[input.source]
  if (sourcePoints > 0) {
    score += sourcePoints
    reasons.push(`The enquiry source adds weight (+${sourcePoints}).`)
  }

  const statusPoints = STATUS_POINTS[input.status]
  if (statusPoints !== 0) {
    score += statusPoints
    const statusReason = STATUS_REASONS[input.status]
    if (statusReason) reasons.push(statusReason)
  }

  const now = input.now ?? new Date()
  const ageHours = (now.getTime() - input.createdAt.getTime()) / (60 * 60 * 1000)
  if (ageHours <= 48) {
    score += 3
    reasons.push("The enquiry arrived in the last 48 hours (+3).")
  }

  const clamped = Math.max(0, Math.min(100, score))
  const category = clamped >= HOT_THRESHOLD ? "hot" : clamped >= WARM_THRESHOLD ? "warm" : "cold"

  const suggestedQuestions: string[] = []
  if (!input.interestedIn?.trim()) {
    suggestedQuestions.push("What exactly are you looking for?")
  }
  if (!input.city?.trim()) {
    suggestedQuestions.push("Which area or city should the team focus on?")
  }
  if (messageLength < 30) {
    suggestedQuestions.push("What is your timeline for making a decision?")
  }
  if (input.status === "NEW") {
    suggestedQuestions.push("What budget range are you considering?")
  }
  if (!input.email?.trim()) {
    suggestedQuestions.push("Would you like the details or a quote by email?")
  }
  if (suggestedQuestions.length === 0) {
    suggestedQuestions.push("Confirm the next step and the best time to call.")
  }

  return {
    category,
    score: clamped,
    reasons,
    suggestedQuestions: suggestedQuestions.slice(0, 4),
  }
}

/** Service wrapper matching the module contract. */
export class RuleBasedLeadScoringService implements AiLeadScoringService {
  qualifyLead(input: AiLeadQualificationInput): AiLeadQualification {
    return qualifyLead(input)
  }
}
