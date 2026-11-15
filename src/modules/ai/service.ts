import { ApiError } from "@/lib/errors"
import { getEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { ANALYTICS_PERIOD_LABELS } from "@/modules/analytics/types"
import { getAnalyticsOverview } from "@/modules/analytics/service"
import { recordAudit } from "@/modules/audit/service"
import { canWriteCampaigns } from "@/modules/auth/rbac"
import type { BusinessContext } from "@/modules/auth/session"
import { findActiveIndustryBySlug } from "@/modules/business/repository"
import { findBusinessCampaignDefaults } from "@/modules/campaigns/repository"
import { getCampaignDetail } from "@/modules/campaigns/service"
import { getLeadDetail } from "@/modules/leads/service"
import { buildCampaignSuggestions } from "./campaign-assistant"
import { ProviderAiContentService } from "./content-service"
import { suggestFollowUp } from "./follow-up"
import type {
  AiCampaignSuggestion,
  AiFollowUpPlan,
  AiGeneratedCopy,
  AiGeneratedLandingContent,
  AiLeadQualification,
} from "./index"
import { qualifyLead } from "./lead-qualification"
import { getAiProvider, isAiConfigured } from "./provider"
import {
  adCopyInputSchema,
  landingContentInputSchema,
  type AiTone,
} from "./schemas"

/**
 * Tenant-facing AI orchestration.
 *
 * Every function takes the verified `BusinessContext`; authorization, rate
 * limiting, audit logging and `businessId` scoping happen here, not in routes.
 * Content generation requires a configured provider. Campaign review, lead
 * qualification and follow-up drafts are rule-based and always available.
 */

interface AiAuditMeta {
  ipAddress?: string
}

const HOUR_MS = 60 * 60 * 1000
const AD_COPY_LIMIT = 20
const LANDING_CONTENT_LIMIT = 20

export interface AiGenerationMeta {
  provider: string
  model: string
  tone: AiTone
}

export interface AdCopyResult {
  copy: AiGeneratedCopy
  meta: AiGenerationMeta
}

export interface LandingContentResult {
  content: AiGeneratedLandingContent
  meta: AiGenerationMeta
}

export interface CampaignReviewResult {
  campaignId: string
  period: "30d"
  periodLabel: string
  basedOn: "rules"
  suggestions: AiCampaignSuggestion[]
}

export interface LeadQualificationResult {
  leadId: string
  basedOn: "rules"
  qualification: AiLeadQualification
}

export interface LeadFollowUpResult {
  leadId: string
  basedOn: "rules"
  plan: AiFollowUpPlan
}

// ---------------------------------------------------------------------------
// Authorization and shared helpers
// ---------------------------------------------------------------------------

function assertCanGenerate(context: BusinessContext): void {
  if (!canWriteCampaigns(context.role)) {
    throw ApiError.forbidden(
      "Only owners and admins can generate campaign content.",
    )
  }
}

async function enforceRateLimit(key: string, limit: number): Promise<void> {
  const result = await checkRateLimit({ key, limit, windowMs: HOUR_MS })
  if (!result.allowed) throw ApiError.tooManyRequests(result.retryAfterSeconds)
}

async function resolveIndustryName(
  context: BusinessContext,
  industrySlug: string | undefined,
): Promise<string> {
  if (industrySlug) {
    const industry = await findActiveIndustryBySlug(industrySlug)
    if (!industry) {
      throw ApiError.badRequest("invalid_industry", "Choose an industry from the list.")
    }
    return industry.name
  }

  const defaults = await findBusinessCampaignDefaults(context.businessId)
  if (defaults?.industry?.slug) {
    const industry = await findActiveIndustryBySlug(defaults.industry.slug)
    if (industry) return industry.name
  }

  return "local business"
}

function assertConfigured(): { provider: string; model: string } {
  const provider = getAiProvider()
  const env = getEnv()
  return { provider: provider.name, model: env.AI_MODEL }
}

/** Whether content generation can run on this deployment. */
export function getAiStatus(): {
  configured: boolean
  provider: string
  model: string | null
} {
  const env = getEnv()
  const configured = isAiConfigured()
  return {
    configured,
    provider: env.AI_PROVIDER,
    model: configured ? env.AI_MODEL : null,
  }
}

// ---------------------------------------------------------------------------
// Provider-backed content generation
// ---------------------------------------------------------------------------

export async function generateAdCopy(
  context: BusinessContext,
  input: unknown,
  audit: AiAuditMeta = {},
): Promise<AdCopyResult> {
  assertCanGenerate(context)
  const data = adCopyInputSchema.parse(input)
  const provider = assertConfigured()

  await enforceRateLimit(`ai:ad-copy:${context.businessId}`, AD_COPY_LIMIT)

  const industryName = await resolveIndustryName(context, data.industrySlug)
  const service = new ProviderAiContentService(getAiProvider())
  const copy = await service.generateAdCopy({
    businessName: context.businessName,
    industryName,
    productDetails: data.productDetails,
    offerDetails: data.offerDetails,
    targetAudience: data.targetAudience,
    tone: data.tone,
  })

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "ai.ad_copy_generated",
    entityType: "Business",
    entityId: context.businessId,
    metadata: { tone: data.tone, industry: data.industrySlug ?? null, provider: provider.provider },
    ipAddress: audit.ipAddress,
  })

  logger.info("ai.ad_copy_generated", {
    businessId: context.businessId,
    actorId: context.userId,
    provider: provider.provider,
    tone: data.tone,
  })

  return {
    copy,
    meta: { provider: provider.provider, model: provider.model, tone: data.tone },
  }
}

export async function generateLandingContent(
  context: BusinessContext,
  input: unknown,
  audit: AiAuditMeta = {},
): Promise<LandingContentResult> {
  assertCanGenerate(context)
  const data = landingContentInputSchema.parse(input)
  const provider = assertConfigured()

  await enforceRateLimit(
    `ai:landing-content:${context.businessId}`,
    LANDING_CONTENT_LIMIT,
  )

  const industryName = await resolveIndustryName(context, data.industrySlug)
  const service = new ProviderAiContentService(getAiProvider())
  const content = await service.generateLandingContent({
    businessName: context.businessName,
    industryName,
    campaignName: data.campaignName,
    productDetails: data.productDetails,
    offerDetails: data.offerDetails,
    targetAudience: data.targetAudience,
    targetLocation: data.targetLocation,
    priceDisplay: data.priceDisplay,
    tone: data.tone,
  })

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "ai.landing_content_generated",
    entityType: "Business",
    entityId: context.businessId,
    metadata: { tone: data.tone, industry: data.industrySlug ?? null, provider: provider.provider },
    ipAddress: audit.ipAddress,
  })

  logger.info("ai.landing_content_generated", {
    businessId: context.businessId,
    actorId: context.userId,
    provider: provider.provider,
    tone: data.tone,
  })

  return {
    content,
    meta: { provider: provider.provider, model: provider.model, tone: data.tone },
  }
}

// ---------------------------------------------------------------------------
// Rule-based assistance (no provider required)
// ---------------------------------------------------------------------------

export async function getCampaignReview(
  context: BusinessContext,
  campaignId: string,
): Promise<CampaignReviewResult> {
  const campaign = await getCampaignDetail(context, campaignId)
  const overview = await getAnalyticsOverview(context, {
    period: "30d",
    campaignId,
  })

  const suggestions = buildCampaignSuggestions(
    {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      headline: campaign.headline,
      promoDescription: campaign.promoDescription,
      description: campaign.description,
      productDetails: campaign.productDetails,
      offerDetails: campaign.offerDetails,
      priceDisplay: campaign.priceDisplay,
      priceInPaise: campaign.priceInPaise,
      contactPhone: campaign.contactPhone,
      contactEmail: campaign.contactEmail,
      targetLocation: campaign.targetLocation,
      targetAudience: campaign.targetAudience,
      imageCount: campaign.images.length,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      leadCount: campaign.leadCount,
      industryName: campaign.industry?.name ?? null,
    },
    {
      periodLabel: ANALYTICS_PERIOD_LABELS["30d"],
      pageViews: overview.summary.pageViews,
      uniqueVisitors: overview.summary.uniqueVisitors,
      enquiries: overview.summary.enquiries,
      conversionRate: overview.summary.conversionRate,
      qualifiedLeads: overview.summary.qualifiedLeads,
      convertedLeads: overview.summary.convertedLeads,
    },
  )

  return {
    campaignId,
    period: "30d",
    periodLabel: ANALYTICS_PERIOD_LABELS["30d"],
    basedOn: "rules",
    suggestions,
  }
}

export async function getLeadQualification(
  context: BusinessContext,
  leadId: string,
): Promise<LeadQualificationResult> {
  const lead = await getLeadDetail(context, leadId)

  return {
    leadId,
    basedOn: "rules",
    qualification: qualifyLead({
      status: lead.status,
      source: lead.source,
      message: lead.message,
      interestedIn: lead.interestedIn,
      city: lead.city,
      email: lead.email,
      consentGiven: lead.consentGiven,
      createdAt: lead.createdAt,
      nextFollowUpAt: lead.nextFollowUpAt,
      lastContactedAt: lead.lastContactedAt,
      campaignName: lead.campaign?.name ?? null,
    }),
  }
}

export async function getLeadFollowUp(
  context: BusinessContext,
  leadId: string,
): Promise<LeadFollowUpResult> {
  const lead = await getLeadDetail(context, leadId)

  return {
    leadId,
    basedOn: "rules",
    plan: suggestFollowUp({
      leadName: lead.name,
      businessName: context.businessName,
      status: lead.status,
      interestedIn: lead.interestedIn,
      city: lead.city,
      email: lead.email,
      campaignName: lead.campaign?.name ?? null,
      message: lead.message,
      consentGiven: lead.consentGiven,
      nextFollowUpAt: lead.nextFollowUpAt,
      lastContactedAt: lead.lastContactedAt,
      createdAt: lead.createdAt,
    }),
  }
}
