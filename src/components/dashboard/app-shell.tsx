"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Building2,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Tag,
  UserCog,
  Users,
} from "lucide-react"
import { Logo } from "@/components/marketing/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Items render as disabled "soon" entries until their module ships. */
  available: boolean
}

const BUSINESS_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone, available: true },
  { href: "/dashboard/leads", label: "Leads", icon: Users, available: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, available: true },
  { href: "/dashboard/team", label: "Team", icon: UserCog, available: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, available: true },
]

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Platform overview", icon: Gauge, available: true },
  { href: "/admin/businesses", label: "Businesses", icon: Building2, available: true },
  { href: "/admin/industries", label: "Industries", icon: LayoutGrid, available: true },
  { href: "/admin/plans", label: "Plans", icon: Tag, available: true },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone, available: true },
]

interface AppShellProps {
  mode: "business" | "admin"
  businessName?: string
  /** Subscription plan label shown next to the business name (null = no plan row yet). */
  planName?: string | null
  userName: string
  userEmail: string
  children: React.ReactNode
}

/** Authenticated app frame: sidebar (desktop) / sheet (mobile) + topbar. */
export function AppShell({
  mode,
  businessName,
  planName,
  userName,
  userEmail,
  children,
}: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false)
  const pathname = usePathname()
  const nav = mode === "admin" ? ADMIN_NAV : BUSINESS_NAV

  const title = mode === "admin" ? "Platform admin" : "Dashboard"

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarContent
          nav={nav}
          pathname={pathname}
          mode={mode}
          businessName={businessName}
          planName={planName}
          onNavigate={() => undefined}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent
                nav={nav}
                pathname={pathname}
                mode={mode}
                businessName={businessName}
                planName={planName}
                onNavigate={() => setNavOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <span className="text-sm font-medium text-muted-foreground">{title}</span>

          <div className="ml-auto flex items-center gap-2">
            <UserMenu userName={userName} userEmail={userEmail} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function SidebarContent({
  nav,
  pathname,
  mode,
  businessName,
  planName,
  onNavigate,
}: {
  nav: NavItem[]
  pathname: string
  mode: "business" | "admin"
  businessName?: string
  planName?: string | null
  onNavigate: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2 px-2 pt-1">
        <Logo />
      </div>

      <div className="rounded-lg border border-sidebar-border bg-background px-3 py-2.5">
        <p className="truncate text-sm font-medium">
          {mode === "admin" ? "Platform administration" : (businessName ?? "Your business")}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          {mode === "admin" ? (
            <Badge variant="secondary" className="bg-primary/10 text-primary">Admin</Badge>
          ) : planName ? (
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              {planName}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-muted-foreground">No plan</Badge>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1" aria-label="App navigation">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href))

          if (!item.available) {
            return (
              <span
                key={item.href}
                aria-disabled
                title={`${item.label} arrives with an upcoming milestone`}
                className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
                <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">
                  Soon
                </Badge>
              </span>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <p className="px-3 text-xs text-muted-foreground">
        Signed in as <span className="truncate">{businessName ?? "CampaignHub"}</span>
      </p>
    </div>
  )
}

function UserMenu({ userName, userEmail }: { userName: string; userEmail: string }) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{userEmail}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ redirectTo: "/" })}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
