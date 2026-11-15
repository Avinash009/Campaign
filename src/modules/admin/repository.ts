import type { BusinessStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Prisma queries for the platform-admin module.
 *
 * These are cross-tenant reads/writes *by design* and deliberately carry no
 * `businessId` filter. They are only reachable through the platform-admin
 * guards, and the "Platform" in each name keeps that visible in code review.
 */

export interface ListPlatformBusinessesOptions {
  page: number
  pageSize: number
  status?: BusinessStatus
  search?: string
}

export function listPlatformBusinesses(options: ListPlatformBusinessesOptions) {
  const where: Prisma.BusinessWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" } },
            { slug: { contains: options.search, mode: "insensitive" } },
            { email: { contains: options.search, mode: "insensitive" } },
            { owner: { name: { contains: options.search, mode: "insensitive" } } },
            { owner: { email: { contains: options.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  return Promise.all([
    prisma.business.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        status: true,
        createdAt: true,
        industry: { select: { name: true } },
        owner: { select: { name: true, email: true } },
        subscription: { select: { status: true, plan: { select: { name: true } } } },
        _count: { select: { members: true, campaigns: true, leads: true } },
      },
    }),
    prisma.business.count({ where }),
  ])
}

export function findPlatformBusinessById(businessId: string) {
  return prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, slug: true, status: true },
  })
}

export function updatePlatformBusinessStatus(businessId: string, status: BusinessStatus) {
  return prisma.business.update({
    where: { id: businessId },
    data: { status },
    select: { id: true, status: true },
  })
}

// ---------------------------------------------------------------------------
// Industries
// ---------------------------------------------------------------------------

export function listPlatformIndustries() {
  return prisma.industry.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      iconKey: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { businesses: true, campaigns: true } },
    },
  })
}

export function findPlatformIndustryById(industryId: string) {
  return prisma.industry.findUnique({
    where: { id: industryId },
    select: { id: true, slug: true, name: true, isActive: true },
  })
}

export function findIndustryBySlug(slug: string) {
  return prisma.industry.findUnique({ where: { slug }, select: { id: true } })
}

export function createPlatformIndustry(data: Prisma.IndustryCreateInput) {
  return prisma.industry.create({
    data,
    select: { id: true, slug: true, name: true },
  })
}

export function updatePlatformIndustry(industryId: string, data: Prisma.IndustryUpdateInput) {
  return prisma.industry.update({
    where: { id: industryId },
    data,
    select: { id: true, slug: true, name: true, isActive: true },
  })
}

// ---------------------------------------------------------------------------
// Subscription plans
// ---------------------------------------------------------------------------

export function listPlatformPlans() {
  return prisma.subscriptionPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      currency: true,
      amount: true,
      interval: true,
      campaignLimit: true,
      memberLimit: true,
      features: true,
      isActive: true,
      isFeatured: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { subscriptions: true } },
    },
  })
}

export function findPlatformPlanById(planId: string) {
  return prisma.subscriptionPlan.findUnique({
    where: { id: planId },
    select: { id: true, slug: true, name: true, isActive: true },
  })
}

export function findPlanBySlug(slug: string) {
  return prisma.subscriptionPlan.findUnique({ where: { slug }, select: { id: true } })
}

export function createPlatformPlan(data: Prisma.SubscriptionPlanCreateInput) {
  return prisma.subscriptionPlan.create({
    data,
    select: { id: true, slug: true, name: true },
  })
}

export function updatePlatformPlan(planId: string, data: Prisma.SubscriptionPlanUpdateInput) {
  return prisma.subscriptionPlan.update({
    where: { id: planId },
    data,
    select: { id: true, slug: true, name: true, isActive: true },
  })
}

// ---------------------------------------------------------------------------
// Campaign monitoring
// ---------------------------------------------------------------------------

export interface ListPlatformCampaignsOptions {
  page: number
  pageSize: number
  status?: Prisma.CampaignWhereInput["status"]
  search?: string
}

export function listPlatformCampaigns(options: ListPlatformCampaignsOptions) {
  const where: Prisma.CampaignWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" } },
            { slug: { contains: options.search, mode: "insensitive" } },
            { business: { name: { contains: options.search, mode: "insensitive" } } },
            { business: { slug: { contains: options.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  return Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        industry: { select: { name: true } },
        business: { select: { id: true, name: true, slug: true, status: true } },
        _count: { select: { leads: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ])
}

/** Page-view / enquiry totals per campaign for the current page of rows. */
export async function countPlatformCampaignEvents(campaignIds: string[]) {
  if (campaignIds.length === 0) return []
  return prisma.campaignEvent.groupBy({
    by: ["campaignId", "type"],
    where: { campaignId: { in: campaignIds } },
    _count: { _all: true },
  })
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export function getPlatformStatisticsRecord(since: Date) {
  return Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { status: "ACTIVE" } }),
    prisma.business.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count(),
    prisma.businessMember.count({ where: { status: "INVITED" } }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.campaignEvent.count({ where: { type: "PAGE_VIEW" } }),
    prisma.campaignEvent.count({ where: { type: "FORM_SUBMIT" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
  ])
}

/** Newest registered businesses (cross-tenant by design — admin only). */
export function listRecentBusinesses(take: number) {
  return prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      industry: { select: { name: true } },
    },
  })
}
