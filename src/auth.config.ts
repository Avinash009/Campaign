import type { NextAuthConfig } from "next-auth"

/**
 * Auth.js configuration shared by the app and `src/proxy.ts`.
 * Contains no database/Prisma imports so it stays cheap to load.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl
      const user = auth?.user
      const isAuthPage = pathname === "/login" || pathname === "/register"

      // Platform admin area: require the admin flag.
      if (pathname.startsWith("/admin")) {
        if (!user) return false // redirects to /login
        if (user.isPlatformAdmin) return true
        return Response.redirect(new URL("/dashboard", request.nextUrl))
      }

      // Business app: require a session.
      if (pathname.startsWith("/dashboard")) return Boolean(user)

      // Onboarding requires a session but no business membership yet.
      if (pathname === "/onboarding") return Boolean(user)

      // Already signed in? Skip the auth pages.
      if (isAuthPage && user) {
        return Response.redirect(new URL("/dashboard", request.nextUrl))
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isPlatformAdmin = user.isPlatformAdmin ?? false
        token.businessId = user.businessId ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : ""
        session.user.isPlatformAdmin = token.isPlatformAdmin === true
        session.user.businessId = typeof token.businessId === "string" ? token.businessId : null
      }
      return session
    },
  },
  providers: [], // providers are composed in src/auth.ts
} satisfies NextAuthConfig
