import { requirePlatformAdmin } from "@/modules/auth/session"
import { AppShell } from "@/components/dashboard/app-shell"

/** Platform administration shell — guarded by the admin flag. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin()

  return (
    <AppShell
      mode="admin"
      userName={session.user.name ?? session.user.email ?? "Admin"}
      userEmail={session.user.email ?? ""}
    >
      {children}
    </AppShell>
  )
}
