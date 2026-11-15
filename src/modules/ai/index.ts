import type {
  CampaignObjective,
  CampaignStatus,
  CtaType,
  LeadSource,
  LeadStatus,
} from "@prisma/client"
import type { AiTone } from "./schemas"

/**
 * AI service contracts.
 *
 * Two kinds of feature live behind these interfaces:
 *
 * 1. **Provider-backed generation** — `AiContentService` calls a configured
 *    OpenAI-compatible chat-completions endpoint. With `AI_PROVIDER=none` the
 *    factory throws `ai_not_configured`; nothing is simulated.
 * 2. **Transparent rule-based assistance** — campaign review, lead
 *    qualification and follow-up drafts are deterministic functions over real
 *    campaign/lead data. They run without a provider and say so in the UI.
 */

export interface AiContentInput {
  businessName: string
  industryName: string
  productDetails: string
  offerDetails?: string
  targetAudience?: string
  tone?: AiTone
}

export interface AiGeneratedCopy {
  headlines: string[]
  descriptions: string[]
  suggestedCtas: string[]
}

export interface AiLandingContentInput extends AiContentInput {
  campaignName: string
  targetLocation?: string
  priceDisplay?: string
}

export interface AiGeneratedLandingContent {
  headline: string
  promoDescription: string
  productDetails: string
  offerDetails: string
  /** Best matching configured CTA, or null when the model returned free text. */
  suggestedCta: CtaType | null
  /** The model's original CTA wording, always shown to the user. */
  suggestedCtaLabel: string
}

/** Advertisement and landing-page content generator. */
export interface AiContentService {
  generateAdCopy(input: AiContentInput): Promise<AiGeneratedCopy>
  generateLandingContent(input: AiLandingContentInput): Promise<AiGeneratedLandingContent>
}

export interface AiCampaignSuggestion {
  title: string
  detail: string
  severity: "info" | "improvement" | "warning"
}

export interface AiCampaignContext {
  id: string
  name: string
  status: CampaignStatus
  objective: CampaignObjective
  headline: string | null
  promoDescription: string | null
  description: string | null
  productDetails: string | null
  offerDetails: string | null
  priceDisplay: string | null
  priceInPaise: number | null
  contactPhone: string | null
  contactEmail: string | null
  targetLocation: string | null
  targetAudience: string | null
  imageCount: number
  startDate: Date | null
  endDate: Date | null
  leadCount: number
  industryName: string | null
}

export interface AiCampaignPerformance {
  periodLabel: string
  pageViews: number
  uniqueVisitors: number
  enquiries: number
  conversionRate: number | null
  qualifiedLeads: number
  convertedLeads: number
}

/** Campaign review: content gaps and weak-performance signals from real data. */
export interface AiCampaignAssistantService {
  suggestImprovements(input: {
    campaign: AiCampaignContext
    performance: AiCampaignPerformance
  }): AiCampaignSuggestion[]
}

export interface AiLeadQualificationInput {
  status: LeadStatus
  source: LeadSource
  message?: string | null
  interestedIn?: string | null
  city?: string | null
  email?: string | null
  consentGiven: boolean
  createdAt: Date
  nextFollowUpAt?: Date | null
  lastContactedAt?: Date | null
  campaignName?: string | null
  /** Injectable clock for unit tests. */
  now?: Date
}

export interface AiLeadQualification {
  category: "hot" | "warm" | "cold"
  /** 0-100. Every point comes from a listed reason, never a black box. */
  score: number
  reasons: string[]
  suggestedQuestions: string[]
}

/** Lead qualification / prioritisation. Rule-based and transparent. */
export interface AiLeadScoringService {
  qualifyLead(input: AiLeadQualificationInput): AiLeadQualification
}

export type AiFollowUpChannel = "CALL" | "WHATSAPP" | "EMAIL"

export interface AiFollowUpMessage {
  channel: AiFollowUpChannel
  label: string
  body: string
  /** Optional email subject; empty for call/WhatsApp drafts. */
  subject?: string
}

export interface AiFollowUpInput {
  leadName: string
  businessName: string
  status: LeadStatus
  interestedIn?: string | null
  city?: string | null
  email?: string | null
  campaignName?: string | null
  message?: string | null
  consentGiven: boolean
  nextFollowUpAt?: Date | null
  lastContactedAt?: Date | null
  createdAt: Date
  /** Injectable clock for unit tests. */
  now?: Date
}

export interface AiFollowUpPlan {
  priority: "high" | "medium" | "low"
  summary: string
  nextAction: string
  suggestedWhen: string
  messages: AiFollowUpMessage[]
  cautions: string[]
}

/** Follow-up assistant: drafted messages and the next action, never sent by us. */
export interface AiFollowUpService {
  suggestFollowUp(input: AiFollowUpInput): AiFollowUpPlan
}
