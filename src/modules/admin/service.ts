import type { Prisma } from "@prisma/client"
import { ApiError } from "@/lib/errors"
import { uniqueSlug } from "@/lib/slug"
import { recordAudit } from "@/modules/audit/service"
import {
  businessStatusUpdateSchema,
  industryCreateSchema,
  industryUpdateSchema,
  planCreateSchema,
  planUpdateSchema,
  type AdminBusinessListQuery,
  type AdminCampaignListQuery,
} from "./schemas"
import {
  countPlatformCampaignEvents,
  createPlatformIndustry,
  createPlatformPlan,
  findIndustryBySlug,
  findPlanBySlug,
  findPlatformBusinessById,
  findPlatformIndustryById,
  findPlatformPlanById,
  getPlatformStatisticsRecord,
  listPlatformBusinesses,
  listPlatformCampaigns,
  listPlatformIndustries,
  listPlatformPlans,
  listRecentBusinesses,
  updatePlatformBusinessStatus,
  updatePlatformIndustry,
  updatePlatformPlan,
} from "./repository"
import type {
  PaginatedResult,
  PlatformBusinessListItem,
  PlatformCampaignItem,
  PlatformIndustryItem,
  PlatformPlanItem,
  PlatformStatistics,
  RecentBusiness,
} from "./types"

/**
 * Platform administration services (Phase 6).
 *
 * Every function here is cross-tenant by design. Callers must have passed the
 * platform-admin guard (`requirePlatformAdmin` for pages / server components,
 * `requireApiPlatformAdmin` for route handlers); the `actorId` passed to every
 * mutation is the verified admin's user id and is recorded in the audit log.
 */

interface AuditMeta {
  ipAddress?: string
}

function paginate<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

function asStringList(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []
}

// ---------------------------------------------------------------------------
// Statistics & recent activity
// ---------------------------------------------------------------------------

export async function getPlatformStatistics(): Promise<PlatformStatistics> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    totalUsers,
    pendingInvitations,
    totalCampaigns,
    activeCampaigns,
    totalLeads,
    newLeadsLast7Days,
    totalPageViews,
    totalEnquiries,
    trialSubscriptions,
    activeSubscriptions,
  ] = await getPlatformStatisticsRecord(since)

  return {
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    totalUsers,
    pendingInvitations,
    totalCampaigns,
    activeCampaigns,
    totalLeads,
    newLeadsLast7Days,
    totalPageViews,
    totalEnquiries,
    trialSubscriptions,
    activeSubscriptions,
  }
}

export async function getRecentBusinesses(take = 5): Promise<RecentBusiness[]> {
  const businesses = await listRecentBusinesses(take)
  return businesses.map((business) => ({
    id: business.id,
    name: business.name,
    status: business.status,
    createdAt: business.createdAt,
    industryName: business.industry?.name ?? null,
  }))
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

export async function getPlatformBusinessList(
  query: AdminBusinessListQuery,
): Promise<PaginatedResult<PlatformBusinessListItem>> {
  const [rows, total] = await listPlatformBusinesses(query)

  const items: PlatformBusinessListItem[] = rows.map((business) => ({
    id: business.id,
    name: business.name,
    slug: business.slug,
    email: business.email,
    status: business.status,
    industryName: business.industry?.name ?? null,
    ownerName: business.owner?.name ?? null,
    ownerEmail: business.owner?.email ?? null,
    planName: business.subscription?.plan.name ?? null,
    subscriptionStatus: business.subscription?.status ?? null,
    memberCount: business._count.members,
    campaignCount: business._count.campaigns,
    leadCount: business._count.leads,
    createdAt: business.createdAt,
  }))

  return paginate(items, total, query.page, query.pageSize)
}

/** Suspend or reactivate a tenant. Suspension takes its public pages offline. */
export async function setBusinessStatus(
  actorId: string,
  businessId: string,
  input: unknown,
  meta: AuditMeta = {},
) {
  const { status } = businessStatusUpdateSchema.parse(input)
  const business = await findPlatformBusinessById(businessId)
  if (!business) throw ApiError.notFound("Business not found.")

  if (business.status === status) return { id: business.id, status }

  await updatePlatformBusinessStatus(businessId, status)

  await recordAudit({
    actorId,
    businessId,
    action: status === "SUSPENDED" ? "admin.business_suspended" : "admin.business_activated",
    entityType: "Business",
    entityId: businessId,
    metadata: { name: business.name, previousStatus: business.status, status },
    ipAddress: meta.ipAddress,
  })

  return { id: business.id, status }
}

// ---------------------------------------------------------------------------
// Industries
// ---------------------------------------------------------------------------

export async function getPlatformIndustries(): Promise<PlatformIndustryItem[]> {
  const industries = await listPlatformIndustries()
  return industries.map((industry) => ({
    id: industry.id,
    slug: industry.slug,
    name: industry.name,
    description: industry.description,
    iconKey: industry.iconKey,
    isActive: industry.isActive,
    sortOrder: industry.sortOrder,
    businessCount: industry._count.businesses,
    campaignCount: industry._count.campaigns,
    createdAt: industry.createdAt,
    updatedAt: industry.updatedAt,
  }))
}

async function resolveIndustrySlug(name: string, requested: string | undefined, currentId?: string) {
  if (requested) {
    const existing = await findIndustryBySlug(requested)
    if (existing && existing.id !== currentId) {
      throw ApiError.conflict("slug_taken", "That industry slug is already in use.")
    }
    return requested
  }
  if (currentId) {
    throw ApiError.internal("A slug is required when updating an industry.")
  }
  return uniqueSlug(name, async (slug) => (await findIndustryBySlug(slug)) !== null)
}

export async function createIndustry(actorId: string, input: unknown, meta: AuditMeta = {}) {
  const parsed = industryCreateSchema.parse(input)
  const slug = await resolveIndustrySlug(parsed.name, parsed.slug)

  const industry = await createPlatformIndustry({
    name: parsed.name,
    slug,
    description: parsed.description ?? null,
    iconKey: parsed.iconKey ?? null,
    sortOrder: parsed.sortOrder,
    isActive: parsed.isActive,
  })

  await recordAudit({
    actorId,
    action: "admin.industry_created",
    entityType: "Industry",
    entityId: industry.id,
    metadata: { name: industry.name, slug: industry.slug },
    ipAddress: meta.ipAddress,
  })

  return industry
}

export async function updateIndustry(
  actorId: string,
  industryId: string,
  input: unknown,
  meta: AuditMeta = {},
) {
  const parsed = industryUpdateSchema.parse(input)
  const industry = await findPlatformIndustryById(industryId)
  if (!industry) throw ApiError.notFound("Industry not found.")

  const data: Prisma.IndustryUpdateInput = {}
  if (parsed.name !== undefined) data.name = parsed.name
  if (parsed.slug !== undefined) data.slug = await resolveIndustrySlug(parsed.name ?? industry.name, parsed.slug, industryId)
  if (parsed.description !== undefined) data.description = parsed.description
  if (parsed.iconKey !== undefined) data.iconKey = parsed.iconKey
  if (parsed.sortOrder !== undefined) data.sortOrder = parsed.sortOrder
  if (parsed.isActive !== undefined) data.isActive = parsed.isActive

  const updated = await updatePlatformIndustry(industryId, data)

  await recordAudit({
    actorId,
    action: "admin.industry_updated",
    entityType: "Industry",
    entityId: industryId,
    metadata: {
      name: updated.name,
      slug: updated.slug,
      isActive: updated.isActive,
      previousIsActive: industry.isActive,
    },
    ipAddress: meta.ipAddress,
  })

  return updated
}

// ---------------------------------------------------------------------------
// Subscription plans
// ---------------------------------------------------------------------------

export async function getPlatformPlans(): Promise<PlatformPlanItem[]> {
  const plans = await listPlatformPlans()
  return plans.map((plan) => ({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    amountInPaise: plan.amount,
    currency: plan.currency,
    interval: plan.interval,
    campaignLimit: plan.campaignLimit,
    memberLimit: plan.memberLimit,
    features: asStringList(plan.features),
    isActive: plan.isActive,
    isFeatured: plan.isFeatured,
    sortOrder: plan.sortOrder,
    subscriberCount: plan._count.subscriptions,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }))
}

async function resolvePlanSlug(name: string, requested: string | undefined, currentId?: string) {
  if (requested) {
    const existing = await findPlanBySlug(requested)
    if (existing && existing.id !== currentId) {
      throw ApiError.conflict("slug_taken", "That plan slug is already in use.")
    }
    return requested
  }
  if (currentId) {
    throw ApiError.internal("A slug is required when updating a plan.")
  }
  return uniqueSlug(name, async (slug) => (await findPlanBySlug(slug)) !== null)
}

export async function createPlan(actorId: string, input: unknown, meta: AuditMeta = {}) {
  const parsed = planCreateSchema.parse(input)
  const slug = await resolvePlanSlug(parsed.name, parsed.slug)

  const plan = await createPlatformPlan({
    name: parsed.name,
    slug,
    description: parsed.description ?? null,
    amount: parsed.amountInPaise,
    interval: parsed.interval,
    campaignLimit: parsed.campaignLimit ?? null,
    memberLimit: parsed.memberLimit ?? null,
    features: parsed.features,
    isFeatured: parsed.isFeatured,
    isActive: parsed.isActive,
    sortOrder: parsed.sortOrder,
  })

  await recordAudit({
    actorId,
    action: "admin.plan_created",
    entityType: "SubscriptionPlan",
    entityId: plan.id,
    metadata: { name: plan.name, slug: plan.slug },
    ipAddress: meta.ipAddress,
  })

  return plan
}

export async function updatePlan(
  actorId: string,
  planId: string,
  input: unknown,
  meta: AuditMeta = {},
) {
  const parsed = planUpdateSchema.parse(input)
  const plan = await findPlatformPlanById(planId)
  if (!plan) throw ApiError.notFound("Plan not found.")

  const data: Prisma.SubscriptionPlanUpdateInput = {}
  if (parsed.name !== undefined) data.name = parsed.name
  if (parsed.slug !== undefined) data.slug = await resolvePlanSlug(parsed.name ?? plan.name, parsed.slug, planId)
  if (parsed.description !== undefined) data.description = parsed.description
  if (parsed.amountInPaise !== undefined) data.amount = parsed.amountInPaise
  if (parsed.interval !== undefined) data.interval = parsed.interval
  if (parsed.campaignLimit !== undefined) data.campaignLimit = parsed.campaignLimit
  if (parsed.memberLimit !== undefined) data.memberLimit = parsed.memberLimit
  if (parsed.features !== undefined) data.features = parsed.features
  if (parsed.isFeatured !== undefined) data.isFeatured = parsed.isFeatured
  if (parsed.isActive !== undefined) data.isActive = parsed.isActive
  if (parsed.sortOrder !== undefined) data.sortOrder = parsed.sortOrder

  const updated = await updatePlatformPlan(planId, data)

  await recordAudit({
    actorId,
    action: "admin.plan_updated",
    entityType: "SubscriptionPlan",
    entityId: planId,
    metadata: {
      name: updated.name,
      slug: updated.slug,
      isActive: updated.isActive,
      previousIsActive: plan.isActive,
    },
    ipAddress: meta.ipAddress,
  })

  return updated
}

// ---------------------------------------------------------------------------
// Campaign monitoring
// ---------------------------------------------------------------------------

export async function getPlatformCampaignList(
  query: AdminCampaignListQuery,
): Promise<PaginatedResult<PlatformCampaignItem>> {
  const [rows, total] = await listPlatformCampaigns(query)
  const eventGroups = await countPlatformCampaignEvents(rows.map((row) => row.id))

  const counts = new Map<string, { pageViews: number; enquiries: number }>()
  for (const group of eventGroups) {
    const entry = counts.get(group.campaignId) ?? { pageViews: 0, enquiries: 0 }
    if (group.type === "PAGE_VIEW") entry.pageViews += group._count._all
    if (group.type === "FORM_SUBMIT") entry.enquiries += group._count._all
    counts.set(group.campaignId, entry)
  }

  const items: PlatformCampaignItem[] = rows.map((campaign) => {
    const eventCount = counts.get(campaign.id) ?? { pageViews: 0, enquiries: 0 }
    return {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      businessId: campaign.business.id,
      businessName: campaign.business.name,
      businessSlug: campaign.business.slug,
      businessStatus: campaign.business.status,
      industryName: campaign.industry?.name ?? null,
      leadCount: campaign._count.leads,
      pageViews: eventCount.pageViews,
      enquiries: eventCount.enquiries,
      publishedAt: campaign.publishedAt,
      createdAt: campaign.createdAt,
    }
  })

  return paginate(items, total, query.page, query.pageSize)
}
