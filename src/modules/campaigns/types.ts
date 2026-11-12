import type { CampaignObjective, CampaignStatus, CtaType } from "@prisma/client"

/**
 * Campaign DTOs returned by the service layer. Dates stay as `Date` objects;
 * pages format them with `src/lib/format.ts`.
 */

export interface CampaignImageDto {
  id: string
  url: string
  altText: string | null
  sortOrder: number
}

export interface CampaignListItem {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  objective: CampaignObjective
  headline: string | null
  priceDisplay: string | null
  startDate: Date | null
  endDate: Date | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  industry: { name: string; slug: string } | null
  coverImageUrl: string | null
  leadCount: number
}

export interface CampaignDetail {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  objective: CampaignObjective
  ctaType: CtaType
  description: string | null
  headline: string | null
  promoDescription: string | null
  productDetails: string | null
  offerDetails: string | null
  priceDisplay: string | null
  priceInPaise: number | null
  currency: string | null
  videoUrl: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  targetLocation: string | null
  targetAudience: string | null
  ageRangeMin: number | null
  ageRangeMax: number | null
  interests: string[]
  startDate: Date | null
  endDate: Date | null
  publishedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  industry: { name: string; slug: string } | null
  createdBy: { name: string } | null
  images: CampaignImageDto[]
  leadCount: number
  publicUrl: string
}

export interface CampaignListResult {
  items: CampaignListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CampaignPlanUsage {
  campaignLimit: number | null
  campaignsUsed: number
  planName: string | null
}

export interface PublicCampaign {
  id: string
  name: string
  slug: string
  headline: string | null
  promoDescription: string | null
  description: string | null
  productDetails: string | null
  offerDetails: string | null
  priceDisplay: string | null
  priceInPaise: number | null
  currency: string | null
  ctaType: CtaType
  videoUrl: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  targetLocation: string | null
  targetAudience: string | null
  startDate: Date | null
  endDate: Date | null
  publishedAt: Date | null
  industry: { name: string; slug: string } | null
  images: CampaignImageDto[]
  business: {
    name: string
    slug: string
    phone: string | null
    email: string
    website: string | null
    city: string | null
    state: string | null
    description: string | null
    logoUrl: string | null
  }
}

export interface CampaignPreview {
  campaign: PublicCampaign
  status: CampaignStatus
}

export interface CampaignFormContext {
  industries: { id: string; name: string; slug: string }[]
  campaignLimit: number | null
  campaignsUsed: number
  planName: string | null
  businessIndustrySlug: string | null
}

export interface CampaignCreated {
  id: string
  slug: string
}
