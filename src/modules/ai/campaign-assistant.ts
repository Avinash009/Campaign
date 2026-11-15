import type {
  AiCampaignAssistantService,
  AiCampaignContext,
  AiCampaignPerformance,
  AiCampaignSuggestion,
} from "./index"

/**
 * Rule-based campaign review.
 *
 * Reads the campaign's own content and its first-party landing-page metrics.
 * No provider call, no forecast: every suggestion points at a concrete field or
 * a measured number. Warnings are listed before optional improvements.
 */

function inr(value: number): string {
  return value.toLocaleString("en-IN")
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function buildCampaignSuggestions(
  campaign: AiCampaignContext,
  performance: AiCampaignPerformance,
): AiCampaignSuggestion[] {
  const suggestions: AiCampaignSuggestion[] = []
  const now = new Date()

  if (campaign.status === "ACTIVE" && performance.pageViews === 0) {
    suggestions.push({
      severity: "warning",
      title: "No tracked visits in this period",
      detail: `Nobody opened the landing page in the ${performance.periodLabel.toLowerCase()}. Share the public link in your messages, posts and WhatsApp status, and include UTM tags if you want source tracking.`,
    })
  }

  if (performance.pageViews >= 10 && performance.enquiries === 0) {
    suggestions.push({
      severity: "warning",
      title: "Visitors are not enquiring",
      detail: `${inr(performance.pageViews)} page view${performance.pageViews === 1 ? "" : "s"} and ${inr(performance.uniqueVisitors)} unique visitor${performance.uniqueVisitors === 1 ? "" : "s"} produced no enquiries. Check that the headline states the offer clearly, the enquiry form is easy to reach, and a phone number or email is visible.`,
    })
  } else if (performance.conversionRate !== null && performance.conversionRate < 2 && performance.pageViews >= 20) {
    suggestions.push({
      severity: "improvement",
      title: "Low enquiry conversion",
      detail: `Conversion is ${percent(performance.conversionRate)} from ${inr(performance.pageViews)} page views. Tighten the headline and first paragraph so visitors immediately understand the offer, price and location.`,
    })
  } else if (
    performance.conversionRate !== null &&
    performance.conversionRate >= 5 &&
    performance.enquiries > 0
  ) {
    suggestions.push({
      severity: "info",
      title: "Landing page is converting",
      detail: `${percent(performance.conversionRate)} conversion from ${inr(performance.pageViews)} page views. Keep the current headline and CTA, and test one change at a time.`,
    })
  }

  if (!campaign.headline?.trim()) {
    suggestions.push({
      severity: "warning",
      title: "Add a headline",
      detail: "The headline is the first thing visitors read and is required before publishing.",
    })
  }

  if (!campaign.promoDescription?.trim() && !campaign.description?.trim()) {
    suggestions.push({
      severity: "improvement",
      title: "Add a promotional description",
      detail: "Explain the offer in one or two short paragraphs: what it is, who it is for and what happens next.",
    })
  }

  if (!campaign.contactPhone?.trim() && !campaign.contactEmail?.trim()) {
    suggestions.push({
      severity: "warning",
      title: "Add a contact method",
      detail: "Visitors need a phone number or email to reach you. CampaignHub does not call or message customers for you.",
    })
  }

  if (campaign.imageCount === 0) {
    suggestions.push({
      severity: "improvement",
      title: "Add at least one image",
      detail: "A real photo of the product, property or team helps visitors trust the page. Avoid stock images that do not match the offer.",
    })
  }

  if (!campaign.targetAudience?.trim()) {
    suggestions.push({
      severity: "info",
      title: "Describe the audience",
      detail: "Add who this offer is for. It keeps the copy focused and helps your team when they follow up.",
    })
  }

  if (!campaign.targetLocation?.trim()) {
    suggestions.push({
      severity: "info",
      title: "Add a target location",
      detail: "A city or service area sets expectations and helps you judge whether enquiries are relevant.",
    })
  }

  if (campaign.priceInPaise === null && !campaign.priceDisplay?.trim()) {
    suggestions.push({
      severity: "info",
      title: "Consider showing a price",
      detail: "If you can share a starting price or range, add it. Pages that answer the price question usually get more serious enquiries.",
    })
  }

  if (campaign.status === "DRAFT") {
    suggestions.push({
      severity: "info",
      title: "Campaign is still a draft",
      detail: "The public link does not work yet. Complete the checklist on this page, then publish when you are ready.",
    })
  } else if (campaign.status === "PAUSED") {
    suggestions.push({
      severity: "info",
      title: "Campaign is paused",
      detail: "The public page is offline while paused. Resume it when you can handle new enquiries.",
    })
  }

  if (campaign.endDate && campaign.endDate.getTime() < now.getTime()) {
    suggestions.push({
      severity: "warning",
      title: "End date has passed",
      detail: "Update the campaign dates or complete the campaign. A finished offer should not stay open.",
    })
  } else if (!campaign.endDate) {
    suggestions.push({
      severity: "info",
      title: "No end date set",
      detail: "An end date protects you from enquiries after the offer expires. Add one if this is a time-limited promotion.",
    })
  }

  if (suggestions.length === 0) {
    suggestions.push({
      severity: "info",
      title: "No obvious gaps",
      detail: "Content and measured performance look consistent for this period. Keep watching enquiries and follow up quickly.",
    })
  }

  const weight: Record<AiCampaignSuggestion["severity"], number> = {
    warning: 0,
    improvement: 1,
    info: 2,
  }

  return suggestions.sort((a, b) => weight[a.severity] - weight[b.severity]).slice(0, 8)
}

/** Service wrapper matching the module contract. */
export class RuleBasedCampaignAssistantService implements AiCampaignAssistantService {
  suggestImprovements(input: {
    campaign: AiCampaignContext
    performance: AiCampaignPerformance
  }): AiCampaignSuggestion[] {
    return buildCampaignSuggestions(input.campaign, input.performance)
  }
}
