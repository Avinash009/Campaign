import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Prisma queries for the campaigns module. No business rules here — see
 * service.ts. Every tenant query takes `businessId` explicitly so cross-tenant
 * reads/writes are impossible by construction.
 */

export interface ListCampaignsOptions {
  page: number
  pageSize: number
  status?: Prisma.CampaignWhereInput["status"]
  search?: string
}

export async function listCampaigns(businessId: string, options: ListCampaignsOptions) {
  const where: Prisma.CampaignWhereInput = {
    businessId,
    ...(options.status ? { status: options.status } : {}),
    ...(options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" } },
            { headline: { contains: options.search, mode: "insensitive" } },
            { description: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
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
        objective: true,
        headline: true,
        priceDisplay: true,
        startDate: true,
        endDate: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        industry: { select: { name: true, slug: true } },
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { leads: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ])

  return { rows, total }
}

export function findCampaignById(businessId: string, campaignId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      objective: true,
      ctaType: true,
      description: true,
      headline: true,
      promoDescription: true,
      productDetails: true,
      offerDetails: true,
      price: true,
      priceDisplay: true,
      currency: true,
      videoUrl: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
      targetLocation: true,
      targetAudience: true,
      ageRangeMin: true,
      ageRangeMax: true,
      interests: true,
      startDate: true,
      endDate: true,
      publishedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      industry: { select: { name: true, slug: true } },
      createdBy: { select: { name: true } },
      images: {
        select: { id: true, url: true, altText: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { leads: true } },
    },
  })
}

export function findCampaignSlug(slug: string) {
  return prisma.campaign.findUnique({ where: { slug }, select: { id: true } })
}

export function createCampaign(data: Prisma.CampaignUncheckedCreateInput) {
  return prisma.campaign.create({
    data,
    select: { id: true, slug: true },
  })
}

export function updateCampaignRecord(
  campaignId: string,
  data: Prisma.CampaignUncheckedUpdateInput,
) {
  return prisma.campaign.update({
    where: { id: campaignId },
    data,
    select: { id: true, slug: true },
  })
}

export function updateCampaignStatusRecord(
  campaignId: string,
  data: Prisma.CampaignUncheckedUpdateInput,
) {
  return prisma.campaign.update({
    where: { id: campaignId },
    data,
    select: { id: true, status: true },
  })
}

export function countCampaigns(
  businessId: string,
  options: { excludeArchived?: boolean } = {},
) {
  return prisma.campaign.count({
    where: {
      businessId,
      ...(options.excludeArchived ? { status: { not: "ARCHIVED" } } : {}),
    },
  })
}

export function countCampaignImages(campaignId: string) {
  return prisma.campaignImage.count({ where: { campaignId } })
}

export function createCampaignImage(data: Prisma.CampaignImageUncheckedCreateInput) {
  return prisma.campaignImage.create({
    data,
    select: { id: true, url: true, altText: true, sortOrder: true },
  })
}

export function findCampaignImage(campaignId: string, imageId: string) {
  return prisma.campaignImage.findFirst({
    where: { id: imageId, campaignId },
    select: { id: true, url: true },
  })
}

export function deleteCampaignImage(campaignId: string, imageId: string) {
  return prisma.campaignImage.deleteMany({ where: { id: imageId, campaignId } })
}

export function findBusinessCampaignDefaults(businessId: string) {
  return prisma.business.findUnique({
    where: { id: businessId },
    select: {
      name: true,
      phone: true,
      email: true,
      logoUrl: true,
      industry: { select: { slug: true } },
    },
  })
}

/** Public business fields shown on campaign pages and in owner previews. */
export function findBusinessPublicProfile(businessId: string) {
  return prisma.business.findUnique({
    where: { id: businessId },
    select: {
      name: true,
      slug: true,
      phone: true,
      email: true,
      website: true,
      city: true,
      state: true,
      description: true,
      logoUrl: true,
    },
  })
}

/** Public landing page lookup — only ACTIVE campaigns of ACTIVE businesses. */
export function findPublicCampaignBySlug(slug: string) {
  return prisma.campaign.findFirst({
    where: { slug, status: "ACTIVE", business: { status: "ACTIVE" } },
    select: {
      id: true,
      name: true,
      slug: true,
      headline: true,
      promoDescription: true,
      description: true,
      productDetails: true,
      offerDetails: true,
      price: true,
      priceDisplay: true,
      currency: true,
      ctaType: true,
      videoUrl: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
      targetLocation: true,
      targetAudience: true,
      startDate: true,
      endDate: true,
      publishedAt: true,
      industry: { select: { name: true, slug: true } },
      images: {
        select: { id: true, url: true, altText: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
      business: {
        select: {
          name: true,
          slug: true,
          phone: true,
          email: true,
          website: true,
          city: true,
          state: true,
          description: true,
          logoUrl: true,
        },
      },
    },
  })
}
