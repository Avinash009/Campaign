"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { Building2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/**
 * Rendered when a signed-in user has no active business membership.
 * Business registration/onboarding ships in Phase 2; redirecting to /login
 * would loop (logged-in users get bounced back), so we explain instead.
 */
export function NoBusinessState({ userName }: { userName: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" aria-hidden /> No business profile yet
          </CardTitle>
          <CardDescription>
            Hi {userName.split(" ")[0]} — your account is signed in, but it is
            not part of a business yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground">Coming soon</Badge>
            <p className="text-sm text-muted-foreground">
              Business registration opens with the next milestone.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="size-4" aria-hidden /> Back to home
              </Link>
            </Button>
            <Button variant="outline" onClick={() => signOut({ redirectTo: "/" })}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
