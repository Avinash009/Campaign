import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "@/auth.config"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request"
import { getUserWithMemberships, touchLastLogin } from "@/modules/auth/repository"
import { verifyPassword } from "@/modules/auth/password"
import { loginSchema } from "@/modules/auth/schemas"
import { logger } from "@/lib/logger"

const HOUR_MS = 60 * 60 * 1000
/**
 * Login attempts per IP per hour (docs/API.md §1). The credentials provider has
 * no route handler of its own, so the limit lives here where every attempt
 * passes through.
 */
const LOGIN_ATTEMPTS_PER_HOUR = 10

/**
 * Auth.js instance. Credentials provider with scrypt password verification.
 * JWT sessions carry: user id, isPlatformAdmin, and the active businessId.
 * The Account/Session tables exist for future OAuth — see prisma/schema.prisma.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const ip = getClientIp(request)
        const limit = await checkRateLimit({
          key: `login:${ip}`,
          limit: LOGIN_ATTEMPTS_PER_HOUR,
          windowMs: HOUR_MS,
        })
        if (!limit.allowed) {
          logger.warn("auth.login_rate_limited", { ip, retryAfterSeconds: limit.retryAfterSeconds })
          return null
        }

        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await getUserWithMemberships(parsed.data.email)
        if (!user?.passwordHash || !user.isActive) return null

        const valid = await verifyPassword(parsed.data.password, user.passwordHash)
        if (!valid) return null

        const membership =
          user.memberships.find((m) => m.role === "OWNER") ?? user.memberships[0] ?? null

        await touchLastLogin(user.id)
        logger.info("auth.login", { userId: user.id })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isPlatformAdmin: user.isPlatformAdmin,
          businessId: membership?.businessId ?? null,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * The shared config (used by the proxy) is database-free, so the refresh
     * path lives here: after onboarding or accepting an invite the client calls
     * `update()` and the active membership is re-read from the database.
     */
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.isPlatformAdmin = user.isPlatformAdmin ?? false
        token.businessId = user.businessId ?? null
      }

      if (trigger === "update" && typeof token.id === "string") {
        const membership = await prisma.businessMember.findFirst({
          where: { userId: token.id, status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: { businessId: true, role: true },
        })
        token.businessId = membership?.businessId ?? null
      }

      return token
    },
  },
})
