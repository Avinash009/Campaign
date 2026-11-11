import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "@/auth.config"
import { getUserWithMemberships, touchLastLogin } from "@/modules/auth/repository"
import { verifyPassword } from "@/modules/auth/password"
import { loginSchema } from "@/modules/auth/schemas"
import { logger } from "@/lib/logger"

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
      async authorize(credentials) {
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
})
