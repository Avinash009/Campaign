import { auth } from "@/auth"

/**
 * Next.js 16 "proxy" convention (the renamed middleware). Runs on the Node.js
 * runtime before requests reach the app and performs optimistic auth checks
 * using the Auth.js session cookie. Secure, per-request authorization still
 * happens in the auth module helpers — the proxy only pre-filters.
 */
export default auth

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding", "/login", "/register"],
}
