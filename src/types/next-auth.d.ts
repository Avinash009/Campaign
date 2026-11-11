import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isPlatformAdmin: boolean
      businessId: string | null
    } & DefaultSession["user"]
  }

  interface User {
    isPlatformAdmin?: boolean
    businessId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    isPlatformAdmin?: boolean
    businessId?: string | null
  }
}
