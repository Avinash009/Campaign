/**
 * AI service interfaces — Phase 7 placeholders.
 *
 * These interfaces define the contracts the future AI integrations must
 * implement. There are NO implementations and NO endpoints wired to them yet:
 * exposing AI before a real provider exists would be fake functionality
 * (explicitly forbidden by the PRD). When Phase 7 starts, implement these
 * against a chosen provider behind an env-configured factory, mirroring the
 * storage/email adapter pattern.
 */

export interface AiContentInput {
  businessName: string
  industryName: string
  productDetails: string
  offerDetails?: string
  targetAudience?: string
  tone?: "professional" | "friendly" | "urgent"
}

export interface AiGeneratedCopy {
  headlines: string[]
  descriptions: string[]
  suggestedCtas: string[]
}

/** Advertisement content generator (headlines, descriptions, CTA suggestions). */
export interface AiContentService {
  generateAdCopy(input: AiContentInput): Promise<AiGeneratedCopy>
}

export interface AiCampaignSuggestion {
  title: string
  detail: string
  severity: "info" | "improvement" | "warning"
}

/** Campaign assistant: audience ideas, improvements, weak-performance signals. */
export interface AiCampaignAssistantService {
  suggestImprovements(input: {
    campaignSummary: Record<string, unknown>
    performance: Record<string, unknown>
  }): Promise<AiCampaignSuggestion[]>
}

export interface AiLeadQualification {
  category: "hot" | "warm" | "cold"
  score: number // 0-100, transparent rule-based until LLM assist lands
  reasons: string[]
  suggestedQuestions: string[]
}

/** Lead qualification / prioritization. */
export interface AiLeadScoringService {
  qualifyLead(input: {
    message?: string
    interestedIn?: string
    metadata?: Record<string, unknown>
  }): Promise<AiLeadQualification>
}

/** Future exports (Phase 7): factories like getAiContentService(). */
