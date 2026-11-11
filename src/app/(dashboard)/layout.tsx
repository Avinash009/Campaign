import { requireUser, getBusinessContext } from "@/modules/auth/session"
import { getBusinessSubscription } from "@/modules/subscriptions/service"
import { AppShell } from "@/components/dashboard/app-shell"
import { NoBusinessState } from "@/components/dashboard/no-business"
import { redirect } from "next/navigation"

/**
 * Business app shell. Requires an authenticated user; the secure membership
 * check runs here (not just in the proxy) per docs/ARCHITECTURE.md §6.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  const context = await getBusinessContext()

  if (!context) {
    // Platform admins without a business membership belong in /admin.
    if (session.user.isPlatformAdmin) redirect("/admin")
    return <NoBusinessState userName={session.user.name ?? session.user.email ?? "there"} />
  }

  const subscription = await getBusinessSubscription(context.businessId)

  return (
    <AppShell
      mode="business"
      businessName={context.businessName}
      planName={subscription?.planName ?? null}
      userName={context.userName}
      userEmail={context.userEmail}
    >
      {children}
    </AppShell>
  )
}
