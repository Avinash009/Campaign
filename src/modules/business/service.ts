import { randomBytes } from "node:crypto"
import { Prisma, type UserRole } from "@prisma/client"
import { ApiError } from "@/lib/errors"
import { getEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { slugify, uniqueSlug } from "@/lib/slug"
import { recordAudit } from "@/modules/audit/service"
import { getEmailService } from "@/modules/email"
import { notifyManagers } from "@/modules/notifications/service"
import { canEditProfile, canManageTeam } from "@/modules/auth/rbac"
import type { BusinessContext } from "@/modules/auth/session"
import {
  acceptInviteSchema,
  inviteMemberSchema,
  onboardingSchema,
  profileUpdateSchema,
  type AcceptInviteInput,
  type InviteMemberInput,
  type OnboardingInput,
  type ProfileUpdateInput,
} from "./schemas"
import {
  activateInvitation,
  countSeatsUsed,
  createBusinessWithOwner,
  findActiveIndustryBySlug,
  findActiveMembership,
  findBusinessById,
  findBusinessBySlug,
  findInvitationByEmail,
  findInvitationByToken,
  findPlanLimits,
  findTrialPlan,
  findUserMembershipInBusiness,
  listTeamMembers,
  updateBusiness,
  upsertInvitation,
} from "./repository"

/**
 * Business module service: onboarding, profile, team invitations.
 * Authorization uses the caller's BusinessContext (verified membership), never
 * client-supplied ids.
 */

export const INVITATION_TTL_DAYS = 7

interface AuditMeta {
  ipAddress?: string
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface OnboardedBusiness {
  id: string
  name: string
  slug: string
}

export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
  meta: AuditMeta = {},
): Promise<OnboardedBusiness> {
  const data = onboardingSchema.parse(input)

  const existing = await findActiveMembership(userId)
  if (existing) {
    throw ApiError.conflict(
      "already_onboarded",
      "You already belong to a business. Open your dashboard to continue.",
    )
  }

  const industry = await findActiveIndustryBySlug(data.industrySlug)
  if (!industry) {
    throw ApiError.badRequest("invalid_industry", "Choose an industry from the list.")
  }

  if (data.logoUrl) assertOwnedLogoUrl(data.logoUrl)

  const slug = await uniqueSlug(data.businessName, async (candidate) =>
    Boolean(await findBusinessBySlug(candidate)),
  )

  const plan = await findTrialPlan()

  const business = await createBusinessWithOwner({
    name: data.businessName,
    slug,
    email: data.businessEmail.toLowerCase(),
    phone: data.phone,
    website: data.website,
    city: data.city,
    state: data.state,
    description: data.description,
    logoUrl: data.logoUrl,
    industryId: industry.id,
    ownerId: userId,
    trialPlanId: plan?.id ?? null,
  })

  await recordAudit({
    actorId: userId,
    businessId: business.id,
    action: "business.onboarded",
    entityType: "Business",
    entityId: business.id,
    metadata: { slug, industry: industry.slug, trialPlan: plan?.name ?? null },
    ipAddress: meta.ipAddress,
  })

  await getEmailService().send({
    to: data.businessEmail,
    subject: `Your CampaignHub business "${business.name}" is ready`,
    text: `Your business profile is created. Open your dashboard to build your first campaign: ${getAppUrl()}/dashboard`,
    templateId: "business_created",
  })

  await notifyManagers(business.id, {
    exceptUserId: userId,
    type: "SYSTEM",
    title: "Business profile created",
    body: `${business.name} is now on CampaignHub.`,
    linkUrl: "/dashboard",
  })

  logger.info("business.onboarded", { businessId: business.id, userId })

  return { id: business.id, name: business.name, slug: business.slug }
}

/** Rejects logo URLs that were not produced by our own storage adapter. */
export function assertOwnedLogoUrl(logoUrl: string): void {
  const base = getAppUrl()
  const allowed = [`${base}/uploads/`, "/uploads/"]
  if (!allowed.some((prefix) => logoUrl.startsWith(prefix))) {
    throw ApiError.badRequest(
      "invalid_logo_url",
      "Upload the logo through CampaignHub — external image URLs are not allowed.",
    )
  }
}

function getAppUrl(): string {
  return getEnv().APP_URL.replace(/\/$/, "")
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface BusinessProfile {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  website: string | null
  city: string | null
  state: string | null
  country: string | null
  description: string | null
  logoUrl: string | null
  industry: { id: string; name: string; slug: string } | null
  createdAt: Date
}

export async function getBusinessProfile(businessId: string): Promise<BusinessProfile> {
  const business = await findBusinessById(businessId)
  if (!business) throw ApiError.notFound("Business not found.")
  return business
}

export async function updateBusinessProfile(
  context: BusinessContext,
  input: ProfileUpdateInput,
  meta: AuditMeta = {},
): Promise<BusinessProfile> {
  if (!canEditProfile(context.role)) {
    throw ApiError.forbidden("Only owners and admins can edit the business profile.")
  }

  const data = profileUpdateSchema.parse(input)

  let industryId: string | undefined
  if (data.industrySlug) {
    const industry = await findActiveIndustryBySlug(data.industrySlug)
    if (!industry) throw ApiError.badRequest("invalid_industry", "Choose an industry from the list.")
    industryId = industry.id
  }

  if (data.logoUrl) assertOwnedLogoUrl(data.logoUrl)

  await updateBusiness(context.businessId, {
    ...(data.businessName !== undefined ? { name: data.businessName } : {}),
    ...(data.businessEmail !== undefined ? { email: data.businessEmail.toLowerCase() } : {}),
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(industryId !== undefined ? { industryId } : {}),
    ...(data.website !== undefined ? { website: data.website } : {}),
    ...(data.city !== undefined ? { city: data.city } : {}),
    ...(data.state !== undefined ? { state: data.state } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
  })

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "business.profile_updated",
    entityType: "Business",
    entityId: context.businessId,
    metadata: { fields: Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined) },
    ipAddress: meta.ipAddress,
  })

  logger.info("business.profile_updated", {
    businessId: context.businessId,
    actorId: context.userId,
  })

  return getBusinessProfile(context.businessId)
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  status: "ACTIVE" | "INVITED" | "REVOKED"
  joinedAt: Date | null
  invitedAt: Date | null
  invitationExpiresAt: Date | null
}

export interface TeamOverview {
  members: TeamMember[]
  seatLimit: number | null
  seatsUsed: number
  planName: string | null
}

export async function getTeamOverview(businessId: string): Promise<TeamOverview> {
  const [rows, limits] = await Promise.all([listTeamMembers(businessId), findPlanLimits(businessId)])

  const members = rows.map((row) => ({
    id: row.id,
    name: row.user?.name ?? row.invitationEmail ?? "Invited teammate",
    email: row.user?.email ?? row.invitationEmail ?? "",
    role: row.role,
    status: row.status,
    joinedAt: row.joinedAt,
    invitedAt: row.invitedAt,
    invitationExpiresAt: row.invitationExpiresAt,
  }))

  return {
    members,
    seatLimit: limits?.memberLimit ?? null,
    seatsUsed: members.filter((member) => member.status === "ACTIVE" || member.status === "INVITED")
      .length,
    planName: limits?.planName ?? null,
  }
}

export interface InviteResult {
  invitationId: string
  inviteUrl: string
  /** Console email transport reports false — show the link instead of claiming delivery. */
  emailDelivered: boolean
  expiresAt: Date
}

export async function inviteMember(
  context: BusinessContext,
  input: InviteMemberInput,
  meta: AuditMeta = {},
): Promise<InviteResult> {
  if (!canManageTeam(context.role)) {
    throw ApiError.forbidden("Only owners and admins can invite teammates.")
  }

  const data = inviteMemberSchema.parse(input)
  const email = data.email.trim().toLowerCase()

  if (email === context.userEmail.toLowerCase()) {
    throw ApiError.conflict("already_member", "You are already a member of this business.")
  }

  const existingUser = await findUserMembershipInBusiness(context.businessId, email)
  if (existingUser?.memberships.length) {
    throw ApiError.conflict("already_member", "This person is already part of your team.")
  }

  const limits = await findPlanLimits(context.businessId)
  // Re-sending an existing invitation reuses its seat — only new invites count.
  const existingInvitation = await findInvitationByEmail(context.businessId, email)
  if (!existingInvitation && limits?.memberLimit !== null && limits?.memberLimit !== undefined) {
    const seatsUsed = await countSeatsUsed(context.businessId)
    if (seatsUsed >= limits.memberLimit) {
      throw ApiError.conflict(
        "member_limit_reached",
        `Your ${limits.planName} plan includes up to ${limits.memberLimit} team members. Upgrade your plan to invite more people.`,
      )
    }
  }

  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)

  const invitation = await upsertInvitation({
    businessId: context.businessId,
    email,
    role: data.role,
    token,
    expiresAt,
    invitedById: context.userId,
  })

  const inviteUrl = `${getAppUrl()}/invite/${token}`

  const emailResult = await getEmailService().send({
    to: email,
    subject: `${context.businessName} invited you to CampaignHub`,
    text: `${context.userName} invited you to join ${context.businessName} on CampaignHub as ${data.role.toLowerCase()}.\n\nAccept the invitation: ${inviteUrl}\n\nThis link expires in ${INVITATION_TTL_DAYS} days.`,
    templateId: "team_invite",
  })

  await recordAudit({
    actorId: context.userId,
    businessId: context.businessId,
    action: "team.member_invited",
    entityType: "BusinessMember",
    entityId: invitation.id,
    metadata: { email, role: data.role, emailDelivered: emailResult.delivered },
    ipAddress: meta.ipAddress,
  })

  await notifyManagers(context.businessId, {
    exceptUserId: context.userId,
    type: "MEMBER_INVITED",
    title: "Teammate invited",
    body: `${context.userName} invited ${email} as ${data.role.toLowerCase()}.`,
    linkUrl: "/dashboard/team",
  })

  logger.info("team.member_invited", {
    businessId: context.businessId,
    actorId: context.userId,
    role: data.role,
    emailDelivered: emailResult.delivered,
  })

  return {
    invitationId: invitation.id,
    inviteUrl,
    emailDelivered: emailResult.delivered,
    expiresAt,
  }
}

export interface InvitationView {
  email: string
  role: UserRole
  businessName: string
  inviterName: string | null
  expiresAt: Date | null
  expired: boolean
  status: "ACTIVE" | "INVITED" | "REVOKED"
}

/** Read-only invitation lookup for the accept page (never exposes the token). */
export async function getInvitation(token: string): Promise<InvitationView | null> {
  const parsed = acceptInviteSchema.safeParse({ token })
  if (!parsed.success) return null

  const invitation = await findInvitationByToken(parsed.data.token)
  if (!invitation) return null
  if (invitation.status !== "INVITED" || !invitation.invitationEmail) return null

  return {
    email: invitation.invitationEmail,
    role: invitation.role,
    businessName: invitation.business.name,
    inviterName: invitation.invitedBy?.name ?? null,
    expiresAt: invitation.invitationExpiresAt,
    expired: Boolean(
      invitation.invitationExpiresAt && invitation.invitationExpiresAt.getTime() < Date.now(),
    ),
    status: invitation.status,
  }
}

export interface AcceptInviteResult {
  businessId: string
  businessName: string
  role: UserRole
}

export async function acceptInvitation(
  user: { id: string; email: string },
  input: AcceptInviteInput,
  meta: AuditMeta = {},
): Promise<AcceptInviteResult> {
  const data = acceptInviteSchema.parse(input)

  const invitation = await findInvitationByToken(data.token)
  if (!invitation || invitation.status !== "INVITED" || !invitation.invitationEmail) {
    throw ApiError.notFound("This invitation is no longer valid. Ask your teammate to resend it.")
  }

  if (invitation.invitationExpiresAt && invitation.invitationExpiresAt.getTime() < Date.now()) {
    throw ApiError.conflict(
      "invitation_expired",
      "This invitation has expired. Ask your teammate to send a new one.",
    )
  }

  if (invitation.invitationEmail.toLowerCase() !== user.email.toLowerCase()) {
    throw ApiError.forbidden(
      `This invitation was sent to ${invitation.invitationEmail}. Sign in with that email address to accept it.`,
    )
  }

  let activated: { businessId: string; business: { name: string } }
  try {
    activated = await activateInvitation(invitation.id, user.id)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("already_member", "You are already part of this business.")
    }
    throw error
  }

  await recordAudit({
    actorId: user.id,
    businessId: activated.businessId,
    action: "team.invitation_accepted",
    entityType: "BusinessMember",
    entityId: invitation.id,
    metadata: { role: invitation.role },
    ipAddress: meta.ipAddress,
  })

  await notifyManagers(activated.businessId, {
    exceptUserId: user.id,
    type: "SYSTEM",
    title: "New teammate joined",
    body: `${user.email} joined your team as ${invitation.role.toLowerCase()}.`,
    linkUrl: "/dashboard/team",
  })

  logger.info("team.invitation_accepted", {
    businessId: activated.businessId,
    userId: user.id,
    role: invitation.role,
  })

  return {
    businessId: activated.businessId,
    businessName: activated.business.name,
    role: invitation.role,
  }
}

/** Whether a user still needs onboarding (used by redirects and the wizard). */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  return Boolean(await findActiveMembership(userId))
}

/** Suggestions for slug collisions in tests/tools. */
export function suggestedBusinessSlug(name: string): string {
  return slugify(name)
}
