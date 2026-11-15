import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import type { UserRole } from "@prisma/client"

/**
 * Session & tenant context helpers (server-only). Every dashboard page and
 * business service starts from one of these so authorization is never
 * forgotten. See docs/ARCHITECTURE.md §4-6.
 */

export async function getSession() {
  return auth()
}

/** Requires a signed-in user; redirects to /login otherwise. */
export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  return session
}

export interface BusinessContext {
  userId: string
  userName: string
  userEmail: string
  isPlatformAdmin: boolean
  businessId: string
  businessName: string
  businessSlug: string
  role: UserRole
}

/**
 * Resolves the caller's active business membership (secure check — reads the
 * database, not just the JWT). Returns null when the user has no active
 * membership (e.g. a platform admin or a pending onboarding).
 */
export async function getBusinessContext(): Promise<BusinessContext | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: { business: { select: { id: true, name: true, slug: true } } },
  })
  if (!membership) return null

  return {
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? "User",
    userEmail: session.user.email ?? "",
    isPlatformAdmin: session.user.isPlatformAdmin ?? false,
    businessId: membership.business.id,
    businessName: membership.business.name,
    businessSlug: membership.business.slug,
    role: membership.role,
  }
}

/** Requires an active business membership; redirects to /login otherwise. */
export async function requireBusinessContext(): Promise<BusinessContext> {
  const context = await getBusinessContext()
  if (!context) redirect("/login")
  return context
}

/** Requires the platform-admin flag. */
export async function requirePlatformAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (!session.user.isPlatformAdmin) redirect("/dashboard")
  return session
}

// ---------------------------------------------------------------------------
// API variants — throw ApiError instead of redirecting (route handlers)
// ---------------------------------------------------------------------------

/** Requires a signed-in user in a route handler. */
export async function requireApiUser() {
  const session = await auth()
  if (!session?.user?.id) throw ApiError.unauthorized()
  return session
}

/** Requires an active business membership in a route handler. */
export async function requireApiBusinessContext(): Promise<BusinessContext> {
  const session = await auth()
  if (!session?.user?.id) throw ApiError.unauthorized()

  const context = await getBusinessContext()
  if (!context) {
    throw ApiError.forbidden("You need an active business profile to do that.")
  }
  return context
}

/**
 * Requires the platform-admin flag in a route handler. This is a cross-tenant
 * guard: only use it for `/api/admin/*` routes, never for tenant endpoints.
 */
export async function requireApiPlatformAdmin() {
  const session = await requireApiUser()
  if (!session.user.isPlatformAdmin) {
    throw ApiError.forbidden("Platform administrator access is required.")
  }
  return session
}
