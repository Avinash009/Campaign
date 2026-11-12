import type { CampaignStatus, CtaType, Prisma } from "@prisma/client"
import { ApiError } from "@/lib/errors"
import { getEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { uniqueSlug } from "@/lib/slug"
import { recordAudit } from "@/modules/audit/service"
import { canWriteCampaigns } from "@/modules/auth/rbac"
import type { BusinessContext } from "@/modules/auth/session"
import { findActiveIndustryBySlug, findPlanLimits } from "@/modules/business/repository"
import { getActiveIndustries } from "@/modules/industries/service"
import {
  buildImageKey,
  getStorage,
  validateImageUpload,
} from "@/modules/storage"
import { assertCampaignTransition, CAMPAIGN_STATUS_LABELS } from "./lifecycle"
import { MAX_CAMPAIGN_IMAGES } from "./constants"
import {
  campaignInputSchema,
  campaignStatusUpdateSchema,
  type CampaignFormValues,
  type CampaignInput,
  type CampaignListQuery,
} from "./schemas"
import {
  countCampaignImages,
  countCampaigns,
  createCampaign as createCampaignRecord,
  createCampaignImage,
  deleteCampaignImage,
  findBusinessCampaignDefaults,
  findBusinessPublicProfile,
  findCampaignById,
  findCampaignImage,
  findCampaignSlug,
  findPublicCampaignBySlug,
  listCampaigns,
  updateCampaignRecord,
  updateCampaignStatusRecord,
} from "./repository"
import type {
  CampaignCreated,
  CampaignDetail,
  CampaignFormContext,
  CampaignImageDto,
  CampaignListResult,
  CampaignPlanUsage,
  CampaignPreview,
  PublicCampaign,
} from "./types"

/**
 * Campaign module service: create/update/lifecycle, image attachments and the
 * public landing-page read model. Authorization always uses the caller's
 * verified BusinessContext — client-supplied ids are never trusted.
 */

interface AuditMeta {
  ipAddress?: string
}

type CampaignRecord = NonNullable<Awaited<ReturnType<typeof findCampaignById>>>

interface CampaignContentSource {
  id: string
  name: string
  slug: string
  headline: string | null
  promoDescription: string | null
  description: string | null
  productDetails: string | null
  offerDetails: string | null
  price: number | null
  priceDisplay: string | null
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
  images: { id: string; url: string; altText: string | null; sortOrder: number }[]
}

interface BusinessPublicSource {
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

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function getAppUrl(): string {
  return getEnv().APP_URL.replace(/\/$/, "")
}

export function campaignPublicUrl(slug: string): string {
  return `${getAppUrl()}/c/${slug}`
}

function dateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : ""
}

function rupeesInputValue(paise: number | null): string {
  if (paise === null) return ""
  return Number.isInteger(paise / 100) ? String(paise / 100) : (paise / 100).toFixed(2)
}

/** Existing campaign → the form's raw input shape (used for edit + partial PATCH). */
export function toCampaignFormValues(campaign: CampaignRecord) {
  return {
    name: campaign.name,
    description: campaign.description ?? "",
    industrySlug: campaign.industry?.slug ?? "",
    objective: campaign.objective,
    startDate: dateInputValue(campaign.startDate),
    endDate: dateInputValue(campaign.endDate),
    headline: campaign.headline ?? "",
    promoDescription: campaign.promoDescription ?? "",
    productDetails: campaign.productDetails ?? "",
    offerDetails: campaign.offerDetails ?? "",
    priceRupees: rupeesInputValue(campaign.price),
    priceDisplay: campaign.priceDisplay ?? "",
    ctaType: campaign.ctaType,
    videoUrl: campaign.videoUrl ?? "",
    contactName: campaign.contactName ?? "",
    contactPhone: campaign.contactPhone ?? "",
    contactEmail: campaign.contactEmail ?? "",
    targetLocation: campaign.targetLocation ?? "",
    targetAudience: campaign.targetAudience ?? "",
    ageRangeMin: campaign.ageRangeMin === null ? "" : String(campaign.ageRangeMin),
    ageRangeMax: campaign.ageRangeMax === null ? "" : String(campaign.ageRangeMax),
    interestsText: campaign.interests.join(", "),
  }
}

function toCampaignDetail(campaign: CampaignRecord): CampaignDetail {
  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    status: campaign.status,
    objective: campaign.objective,
    ctaType: campaign.ctaType,
    description: campaign.description,
    headline: campaign.headline,
    promoDescription: campaign.promoDescription,
    productDetails: campaign.productDetails,
    offerDetails: campaign.offerDetails,
    priceDisplay: campaign.priceDisplay,
    priceInPaise: campaign.price,
    currency: campaign.currency,
    videoUrl: campaign.videoUrl,
    contactName: campaign.contactName,
    contactPhone: campaign.contactPhone,
    contactEmail: campaign.contactEmail,
    targetLocation: campaign.targetLocation,
    targetAudience: campaign.targetAudience,
    ageRangeMin: campaign.ageRangeMin,
    ageRangeMax: campaign.ageRangeMax,
    interests: campaign.interests,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    publishedAt: campaign.publishedAt,
    completedAt: campaign.completedAt,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    industry: campaign.industry,
    createdBy: campaign.createdBy,
    images: campaign.images,
    leadCount: campaign._count.leads,
    publicUrl: campaignPublicUrl(campaign.slug),
  }
}

function toPublicCampaign(
  campaign: CampaignContentSource,
  business: BusinessPublicSource,
): PublicCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    headline: campaign.headline,
    promoDescription: campaign.promoDescription,
    description: campaign.description,
    productDetails: campaign.productDetails,
    offerDetails: campaign.offerDetails,
    priceDisplay: campaign.priceDisplay,
    priceInPaise: campaign.price,
    currency: campaign.currency,
    ctaType: campaign.ctaType,
    videoUrl: campaign.videoUrl,
    contactName: campaign.contactName,
    contactPhone: campaign.contactPhone,
    contactEmail: campaign.contactEmail,
    targetLocation: campaign.targetLocation,
    targetAudience: campaign.targetAudience,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    publishedAt: campaign.publishedAt,
    industry: campaign.industry,
    images: campaign.images,
    business: {
      name: business.name,
      slug: business.slug,
      phone: business.phone,
      email: business.email,
      website: business.website,
      city: business.city,
      state: business.state,
      description: business.description,
      logoUrl: business.logoUrl,
    },
  }
}

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------

function assertCanManageCampaigns(context: BusinessContext): void {
  if (!canWriteCampaigns(context.role)) {
    throw ApiError.forbidden("Only owners and admins can manage campaigns.")
  }
}

async function findCampaignOrThrow(
  context: BusinessContext,
  campaignId: string,
): Promise<CampaignRecord> {
  const campaign = await findCampaignById(context.businessId, campaignId)
  if (!campaign) throw ApiError.notFound("Campaign not found.")
  return campaign
}

async function resolveIndustryId(slug: string | undefined): Promise<string | null> {
  if (!slug) return null
  const industry = await findActiveIndustryBySlug(slug)
  if (!industry) throw ApiError.badRequest("invalid_industry", "Choose an industry from the list.")
  return industry.id
}

function assertCampaignEditable(campaign: CampaignRecord): void {
  if (campaign.status === "ARCHIVED") {
    throw ApiError.conflict(
      "campaign_archived",
      "Archived campaigns are read-only. Create a new campaign if you want to run this offer again.",
    )
  }
}

// ---------------------------------------------------------------------------
// Plan limits
// ---------------------------------------------------------------------------

export async function getCampaignPlanUsage(businessId: string): Promise<CampaignPlanUsage> {
  const [limits, campaignsUsed] = await Promise.all([
    findPlanLimits(businessId),
    countCampaigns(businessId, { excludeArchived: true }),
  ])

  return {
    campaignLimit: limits?.campaignLimit ?? null,
    campaignsUsed,
    planName: limits?.planName ?? null,
  }
}

async function assertCampaignSlotAvailable(businessId: string): Promise<void> {
  const [limits, used] = await Promise.all([
    findPlanLimits(businessId),
    countCampaigns(businessId, { excludeArchived: true }),
  ])
  const limit = limits?.campaignLimit
  if (limit !== null && limit !== undefined && used >= limit) {
    throw ApiError.conflict(
      "campaign_limit_reached",
      `Your ${limits?.planName ?? "current"} plan includes up to ${limit} campaign${limit === 1 ? "" : "s"}. Archive an old campaign or upgrade your plan to create another.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

export async function createCampaign(
  context: BusinessContext,
  input: unknown,
  meta: AuditMeta = {},
): Promise<CampaignCreated> {
  assertCanManageCampaigns(context)
  const data: CampaignInput = campaignInputSchema.parse(input)
  await assertCampaignSlotAvailable(context.businessId)

  const defaults = await findBusinessCampaignDefaults(context.businessId)
  const industryId = data.industrySlug
    ? await resolveIndustryId(data.industrySlug)
    : defaults?.industry?.slug
      ? await resolveIndustryId(defaults.industry.slug)
      : null

  const slug = await uniqueSlug(data.name, async (candidate) =>
    Boolean(await findCampaignSlug(candidate)),
  )

  const created = await createCampaignRecord({
    businessId: context.businessId,
    createdById: context.userId,
    industryId,
    name: data.name,
    slug,
    description: data.description ?? null,
    objective: data.objective,
    status: "DRAFT",
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    headline: data.headline ?? null,
    promoDescription: data.promoDescription ?? null,
    productDetails: data.productDetails ?? null,
    offerDetails: data.offerDetails ?? null,
    currency: data.priceInPaise === undefined ? null : "INR",
    price: data.priceInPaise ?? null,
    priceDisplay: data.priceDisplay ?? null,
    ctaType: data.ctaType,
    videoUrl: data.videoUrl ?? null,
    contactName: data.contactName ?? context.userName,
    contactPhone: data.contactPhone ?? defaults?.phone ?? null,
    contactEmail: data.contactEmail ?? defaults?.email ?? null,
    targetLocation: data.targetLocation ?? null,
    targetAudience: data.targetAudience ?? null,
    ageRangeMin: data.ageRangeMin ?? null,
    ageRangeMax: data.ageRangeMax ?? null,
    interests: data.interests,
  })

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "campaign.created",
    entityType: "Campaign",
    entityId: created.id,
    metadata: { name: created.slug, objective: data.objective },
    ipAddress: meta.ipAddress,
  })

  logger.info("campaign.created", {
    businessId: context.businessId,
    campaignId: created.id,
    actorId: context.userId,
  })

  return created
}

/** Full or partial update. The patch is merged over the current values before validation. */
export async function updateCampaign(
  context: BusinessContext,
  campaignId: string,
  input: unknown,
  meta: AuditMeta = {},
): Promise<CampaignCreated> {
  assertCanManageCampaigns(context)

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw ApiError.badRequest("invalid_body", "Send a valid campaign payload.")
  }

  const existing = await findCampaignOrThrow(context, campaignId)
  assertCampaignEditable(existing)

  const data: CampaignInput = campaignInputSchema.parse({
    ...toCampaignFormValues(existing),
    ...(input as Record<string, unknown>),
  })

  const industryId = data.industrySlug ? await resolveIndustryId(data.industrySlug) : null

  const update: Prisma.CampaignUncheckedUpdateInput = {
    industryId,
    name: data.name,
    description: data.description ?? null,
    objective: data.objective,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    headline: data.headline ?? null,
    promoDescription: data.promoDescription ?? null,
    productDetails: data.productDetails ?? null,
    offerDetails: data.offerDetails ?? null,
    currency: data.priceInPaise === undefined ? null : "INR",
    price: data.priceInPaise ?? null,
    priceDisplay: data.priceDisplay ?? null,
    ctaType: data.ctaType,
    videoUrl: data.videoUrl ?? null,
    contactName: data.contactName ?? null,
    contactPhone: data.contactPhone ?? null,
    contactEmail: data.contactEmail ?? null,
    targetLocation: data.targetLocation ?? null,
    targetAudience: data.targetAudience ?? null,
    ageRangeMin: data.ageRangeMin ?? null,
    ageRangeMax: data.ageRangeMax ?? null,
    interests: data.interests,
  }

  const updated = await updateCampaignRecord(campaignId, update)

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "campaign.updated",
    entityType: "Campaign",
    entityId: campaignId,
    metadata: { fields: Object.keys(input) },
    ipAddress: meta.ipAddress,
  })

  logger.info("campaign.updated", {
    businessId: context.businessId,
    campaignId,
    actorId: context.userId,
  })

  return updated
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getCampaignDetail(
  context: BusinessContext,
  campaignId: string,
): Promise<CampaignDetail> {
  const campaign = await findCampaignOrThrow(context, campaignId)
  return toCampaignDetail(campaign)
}

export async function getCampaignList(
  businessId: string,
  query: CampaignListQuery,
): Promise<CampaignListResult> {
  const { rows, total } = await listCampaigns(businessId, query)
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      objective: row.objective,
      headline: row.headline,
      priceDisplay: row.priceDisplay,
      startDate: row.startDate,
      endDate: row.endDate,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      industry: row.industry,
      coverImageUrl: row.images[0]?.url ?? null,
      leadCount: row._count.leads,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
  }
}

/** Edit-page payload: the form's raw values plus the (immutable) status. */
export async function getCampaignFormValues(
  context: BusinessContext,
  campaignId: string,
): Promise<{ values: CampaignFormValues; status: CampaignStatus; slug: string }> {
  const campaign = await findCampaignOrThrow(context, campaignId)
  return {
    values: toCampaignFormValues(campaign),
    status: campaign.status,
    slug: campaign.slug,
  }
}

export async function getCampaignFormContext(businessId: string): Promise<CampaignFormContext> {
  const [industries, usage, defaults] = await Promise.all([
    getActiveIndustries(),
    getCampaignPlanUsage(businessId),
    findBusinessCampaignDefaults(businessId),
  ])

  return {
    industries: industries.map((industry) => ({
      id: industry.id,
      name: industry.name,
      slug: industry.slug,
    })),
    campaignLimit: usage.campaignLimit,
    campaignsUsed: usage.campaignsUsed,
    planName: usage.planName,
    businessIndustrySlug: defaults?.industry?.slug ?? null,
  }
}

/** Public landing page data. Returns null for anything not ACTIVE. */
export async function getPublicCampaign(slug: string): Promise<PublicCampaign | null> {
  const campaign = await findPublicCampaignBySlug(slug)
  if (!campaign) return null
  return toPublicCampaign(campaign, campaign.business)
}

/** Owner/admin preview of any non-archived or archived campaign page. */
export async function getCampaignPreview(
  context: BusinessContext,
  campaignId: string,
): Promise<CampaignPreview> {
  const campaign = await findCampaignOrThrow(context, campaignId)
  const business = await findBusinessPublicProfile(context.businessId)
  if (!business) throw ApiError.notFound("Business not found.")

  return {
    campaign: toPublicCampaign(campaign, business),
    status: campaign.status,
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Publishing requires enough content for a useful public page. */
export function publishBlockers(campaign: {
  headline: string | null
  promoDescription: string | null
  description: string | null
  contactPhone: string | null
  contactEmail: string | null
  endDate: Date | null
}): string[] {
  const blockers: string[] = []
  if (!campaign.headline?.trim()) blockers.push("headline")
  if (!campaign.promoDescription?.trim() && !campaign.description?.trim()) {
    blockers.push("description")
  }
  if (!campaign.contactPhone?.trim() && !campaign.contactEmail?.trim()) {
    blockers.push("contact")
  }
  if (campaign.endDate && campaign.endDate.getTime() < startOfTodayUtc().getTime()) {
    blockers.push("endDate")
  }
  return blockers
}

function startOfTodayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

const PUBLISH_BLOCKER_MESSAGES: Record<string, string> = {
  headline:
    "Add a headline before publishing — it is the first thing visitors read on the landing page.",
  description: "Add a promotional description or campaign description before publishing.",
  contact:
    "Add a contact phone number or email so visitors can reach you from the landing page.",
  endDate: "The end date has passed. Update the campaign dates before publishing.",
}

export interface CampaignStatusResult {
  id: string
  status: CampaignStatus
  publicUrl: string
}

export async function changeCampaignStatus(
  context: BusinessContext,
  campaignId: string,
  input: unknown,
  meta: AuditMeta = {},
): Promise<CampaignStatusResult> {
  assertCanManageCampaigns(context)

  const { status } = campaignStatusUpdateSchema.parse(input)
  const existing = await findCampaignOrThrow(context, campaignId)

  if (existing.status === "ARCHIVED") {
    throw ApiError.conflict("campaign_archived", "Archived campaigns cannot be reopened.")
  }

  assertCampaignTransition(existing.status, status)

  if (status === "ACTIVE") {
    const blockers = publishBlockers(existing)
    if (blockers.length > 0) {
      const details = Object.fromEntries(
        blockers.map((blocker) => [blocker, [PUBLISH_BLOCKER_MESSAGES[blocker]]]),
      )
      throw ApiError.badRequest(
        "campaign_incomplete",
        PUBLISH_BLOCKER_MESSAGES[blockers[0]] ?? "Complete the campaign before publishing it.",
        details,
      )
    }
  }

  const now = new Date()
  await updateCampaignStatusRecord(campaignId, {
    status,
    ...(status === "ACTIVE" ? { publishedAt: existing.publishedAt ?? now } : {}),
    ...(status === "COMPLETED" ? { completedAt: now } : {}),
  })

  const action =
    status === "ACTIVE"
      ? existing.status === "PAUSED"
        ? "campaign.resumed"
        : "campaign.published"
      : status === "PAUSED"
        ? "campaign.paused"
        : status === "COMPLETED"
          ? "campaign.completed"
          : "campaign.archived"

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action,
    entityType: "Campaign",
    entityId: campaignId,
    metadata: { from: existing.status, to: status },
    ipAddress: meta.ipAddress,
  })

  logger.info(action, {
    businessId: context.businessId,
    campaignId,
    actorId: context.userId,
  })

  return {
    id: campaignId,
    status,
    publicUrl: campaignPublicUrl(existing.slug),
  }
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

function storageKeyFromUrl(url: string): string | null {
  const marker = "/uploads/"
  const index = url.indexOf(marker)
  if (index === -1) return null
  return url.slice(index + marker.length)
}

export async function addCampaignImages(
  context: BusinessContext,
  campaignId: string,
  files: File[],
  meta: AuditMeta = {},
): Promise<CampaignImageDto[]> {
  assertCanManageCampaigns(context)

  const campaign = await findCampaignOrThrow(context, campaignId)
  assertCampaignEditable(campaign)

  if (files.length === 0) {
    throw ApiError.badRequest("missing_file", "Choose at least one image to upload.")
  }

  const existingCount = await countCampaignImages(campaignId)
  if (existingCount + files.length > MAX_CAMPAIGN_IMAGES) {
    throw ApiError.conflict(
      "image_limit_reached",
      `A campaign can have up to ${MAX_CAMPAIGN_IMAGES} images. Remove one before adding more.`,
    )
  }

  // Validate every file before writing anything so a bad file cannot leave a
  // partial upload behind.
  for (const file of files) {
    validateImageUpload({ contentType: file.type, size: file.size })
  }

  const storage = getStorage()
  const created: CampaignImageDto[] = []

  for (const [index, file] of files.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const stored = await storage.upload({
      data: buffer,
      contentType: file.type,
      key: buildImageKey(
        `businesses/${context.businessId}/campaigns/${campaignId}`,
        file.type,
      ),
    })

    const image = await createCampaignImage({
      campaignId,
      url: stored.url,
      altText: `${campaign.name} image ${existingCount + index + 1}`,
      sortOrder: existingCount + index,
    })
    created.push(image)
  }

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "campaign.images_added",
    entityType: "Campaign",
    entityId: campaignId,
    metadata: { count: created.length },
    ipAddress: meta.ipAddress,
  })

  logger.info("campaign.images_added", {
    businessId: context.businessId,
    campaignId,
    count: created.length,
  })

  return created
}

export async function removeCampaignImage(
  context: BusinessContext,
  campaignId: string,
  imageId: string,
  meta: AuditMeta = {},
): Promise<void> {
  assertCanManageCampaigns(context)

  const campaign = await findCampaignOrThrow(context, campaignId)
  assertCampaignEditable(campaign)

  const image = await findCampaignImage(campaignId, imageId)
  if (!image) throw ApiError.notFound("Image not found.")

  await deleteCampaignImage(campaignId, imageId)

  const key = storageKeyFromUrl(image.url)
  if (key) {
    await getStorage()
      .remove(key)
      .catch((error) => {
        logger.warn("campaign.image_remove_failed", {
          campaignId,
          imageId,
          error: error instanceof Error ? error.message : String(error),
        })
      })
  }

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "campaign.image_removed",
    entityType: "Campaign",
    entityId: campaignId,
    metadata: { imageId },
    ipAddress: meta.ipAddress,
  })
}

/** Small helper used by pages that show "archived" hints without re-deriving labels. */
export function campaignStatusLabel(status: CampaignStatus): string {
  return CAMPAIGN_STATUS_LABELS[status]
}
