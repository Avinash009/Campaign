import type {
  BusinessStatus,
  CampaignStatus,
  PlanInterval,
  SubscriptionStatus,
} from "@prisma/client"

/** Read models shared by the admin pages and API responses (Phase 6). */

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PlatformBusinessListItem {
  id: string
  name: string
  slug: string
  email: string
  status: BusinessStatus
  industryName: string | null
  ownerName: string | null
  ownerEmail: string | null
  planName: string | null
  subscriptionStatus: SubscriptionStatus | null
  memberCount: number
  campaignCount: number
  leadCount: number
  createdAt: Date
}

export interface PlatformIndustryItem {
  id: string
  slug: string
  name: string
  description: string | null
  iconKey: string | null
  isActive: boolean
  sortOrder: number
  businessCount: number
  campaignCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PlatformPlanItem {
  id: string
  slug: string
  name: string
  description: string | null
  amountInPaise: number
  currency: string
  interval: PlanInterval
  campaignLimit: number | null
  memberLimit: number | null
  features: string[]
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  subscriberCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PlatformCampaignItem {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  businessId: string
  businessName: string
  businessSlug: string
  businessStatus: BusinessStatus
  industryName: string | null
  leadCount: number
  pageViews: number
  enquiries: number
  publishedAt: Date | null
  createdAt: Date
}

export interface PlatformStatistics {
  totalBusinesses: number
  activeBusinesses: number
  suspendedBusinesses: number
  totalUsers: number
  pendingInvitations: number
  totalCampaigns: number
  activeCampaigns: number
  totalLeads: number
  newLeadsLast7Days: number
  totalPageViews: number
  totalEnquiries: number
  trialSubscriptions: number
  activeSubscriptions: number
}

export interface RecentBusiness {
  id: string
  name: string
  status: BusinessStatus
  industryName: string | null
  createdAt: Date
}
