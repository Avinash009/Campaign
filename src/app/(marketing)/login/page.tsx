import type { Metadata } from "next"
import Link from "next/link"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your CampaignHub dashboard.",
}

/**
 * Placeholder — the full sign-in page ships with the accounts milestone
 * (Phase 2: registration, login, onboarding). The route exists now so
 * navigation never dead-ends.
 */
export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-24 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LogIn className="size-5 text-primary" aria-hidden /> Sign in
          </CardTitle>
          <CardDescription>Access your CampaignHub dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground">Coming soon</Badge>
            <p className="text-sm text-muted-foreground">
              Accounts and sign-in arrive with the next milestone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
            <Button asChild>
              <Link href="/features">Explore features</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
