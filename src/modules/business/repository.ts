import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Prisma queries for the business module. No business rules here — see
 * service.ts. Every tenant query takes `businessId` explicitly.
 */

export function findActiveIndustryBySlug(slug: string) {
  return prisma.industry.findFirst({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true },
  })
}

/** First active membership for the user (a user may belong to several businesses). */
export function findActiveMembership(userId: string) {
  return prisma.businessMember.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, businessId: true, role: true },
  })
}

export function findBusinessBySlug(slug: string) {
  return prisma.business.findUnique({ where: { slug }, select: { id: true } })
}

export function findBusinessById(businessId: string) {
  return prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      website: true,
      city: true,
      state: true,
      country: true,
      description: true,
      logoUrl: true,
      status: true,
      onboardingCompletedAt: true,
      createdAt: true,
      industry: { select: { id: true, name: true, slug: true } },
    },
  })
}

export interface CreateBusinessInput {
  name: string
  slug: string
  email: string
  phone: string
  industryId: string
  ownerId: string
  website?: string
  city?: string
  state?: string
  description?: string
  logoUrl?: string
  trialPlanId?: string | null
  trialDays?: number
}

/** Creates the business, its OWNER membership and a trial subscription atomically. */
export async function createBusinessWithOwner(input: CreateBusinessInput) {
  return prisma.$transaction(async (tx) => {
    const now = new Date()
    const business = await tx.business.create({
      data: {
        name: input.name,
        slug: input.slug,
        email: input.email,
        phone: input.phone,
        website: input.website ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        description: input.description ?? null,
        logoUrl: input.logoUrl ?? null,
        industryId: input.industryId,
        ownerId: input.ownerId,
        onboardingCompletedAt: now,
      },
      select: { id: true, name: true, slug: true },
    })

    await tx.businessMember.create({
      data: {
        businessId: business.id,
        userId: input.ownerId,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: now,
      },
    })

    if (input.trialPlanId) {
      const trialDays = input.trialDays ?? 14
      await tx.subscription.create({
        data: {
          businessId: business.id,
          planId: input.trialPlanId,
          status: "TRIALING",
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000),
        },
      })
    }

    return business
  })
}

export function updateBusiness(businessId: string, data: Prisma.BusinessUpdateInput) {
  return prisma.business.update({
    where: { id: businessId },
    data,
    select: { id: true, name: true, slug: true },
  })
}

export async function findTrialPlan() {
  const select = { id: true, name: true, memberLimit: true, campaignLimit: true } as const
  const starter = await prisma.subscriptionPlan.findFirst({
    where: { isActive: true, slug: "starter" },
    select,
  })
  if (starter) return starter
  return prisma.subscriptionPlan.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select,
  })
}

/** The current paid plan's seat limit (null = unlimited or no subscription). */
export function findPlanLimits(businessId: string) {
  return prisma.subscription
    .findUnique({
      where: { businessId },
      select: {
        status: true,
        plan: { select: { name: true, memberLimit: true, campaignLimit: true } },
      },
    })
    .then((subscription) =>
      subscription
        ? {
            status: subscription.status,
            planName: subscription.plan.name,
            memberLimit: subscription.plan.memberLimit,
            campaignLimit: subscription.plan.campaignLimit,
          }
        : null,
    )
}

export function listTeamMembers(businessId: string) {
  return prisma.businessMember.findMany({
    where: { businessId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      role: true,
      status: true,
      userId: true,
      invitationEmail: true,
      invitedAt: true,
      invitationExpiresAt: true,
      joinedAt: true,
      user: { select: { name: true, email: true } },
    },
  })
}

export function countSeatsUsed(businessId: string) {
  return prisma.businessMember.count({
    where: { businessId, status: { in: ["ACTIVE", "INVITED"] } },
  })
}

export function findUserMembershipInBusiness(businessId: string, email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      memberships: { where: { businessId }, select: { id: true, status: true } },
    },
  })
}

export function findInvitationByEmail(businessId: string, email: string) {
  return prisma.businessMember.findFirst({
    where: { businessId, invitationEmail: email.toLowerCase(), status: "INVITED" },
    select: { id: true },
  })
}

export function findInvitationByToken(token: string) {
  return prisma.businessMember.findUnique({
    where: { invitationToken: token },
    select: {
      id: true,
      businessId: true,
      role: true,
      status: true,
      invitationEmail: true,
      invitationExpiresAt: true,
      business: { select: { name: true, slug: true } },
      invitedBy: { select: { name: true } },
    },
  })
}

export function upsertInvitation(input: {
  businessId: string
  email: string
  role: "ADMIN" | "MEMBER"
  token: string
  expiresAt: Date
  invitedById: string
}) {
  return findInvitationByEmail(input.businessId, input.email).then((existing) => {
    if (existing) {
      return prisma.businessMember.update({
        where: { id: existing.id },
        data: {
          role: input.role,
          invitationToken: input.token,
          invitationExpiresAt: input.expiresAt,
          invitedById: input.invitedById,
          invitedAt: new Date(),
        },
        select: { id: true },
      })
    }
    return prisma.businessMember.create({
      data: {
        businessId: input.businessId,
        invitationEmail: input.email.toLowerCase(),
        role: input.role,
        status: "INVITED",
        invitationToken: input.token,
        invitationExpiresAt: input.expiresAt,
        invitedById: input.invitedById,
        invitedAt: new Date(),
      },
      select: { id: true },
    })
  })
}

/** Binds an invited membership row to the registered user and activates it. */
export function activateInvitation(memberId: string, userId: string) {
  return prisma.businessMember.update({
    where: { id: memberId },
    data: {
      userId,
      status: "ACTIVE",
      joinedAt: new Date(),
      invitationToken: null,
      invitationExpiresAt: null,
      invitationEmail: null,
    },
    select: { businessId: true, business: { select: { name: true } } },
  })
}
