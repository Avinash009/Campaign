import type { Metadata } from "next"
import Link from "next/link"
import { Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Create your account",
  description: "Register your business on CampaignHub and start your first campaign.",
}

/**
 * Placeholder — business registration ships with the accounts milestone
 * (Phase 2: registration, login, onboarding). The route exists now so
 * navigation never dead-ends.
 */
export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-24 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Rocket className="size-5 text-primary" aria-hidden /> Start free
          </CardTitle>
          <CardDescription>
            Create your business account and launch your first campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground">Coming soon</Badge>
            <p className="text-sm text-muted-foreground">
              Business registration arrives with the next milestone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
            <Button asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
