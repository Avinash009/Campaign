import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, Building2, MailCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/marketing/logo"
import { AcceptInviteButton } from "@/components/business/accept-invite-button"
import { getSession } from "@/modules/auth/session"
import { getInvitation } from "@/modules/business/service"
import { formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Team invitation",
  description: "Accept an invitation to join a business on CampaignHub.",
}

const ROLE_LABELS = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" } as const

/** Invitation acceptance page (Phase 2 task 2.5). */
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params
  const [invitation, session] = await Promise.all([getInvitation(token), getSession()])

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:px-6">
        <Card className="w-full max-w-md">
          {!invitation ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="size-5 text-amber-600" aria-hidden /> Invitation not valid
                </CardTitle>
                <CardDescription>
                  This invitation link has already been used, was cancelled, or does not exist.
                  Ask your teammate to send a new one.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link href="/">Back to home</Link>
                </Button>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardContent>
            </>
          ) : invitation.expired ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="size-5 text-amber-600" aria-hidden /> Invitation expired
                </CardTitle>
                <CardDescription>
                  The invitation from {invitation.businessName} has expired. Ask your teammate
                  to send a new invitation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href="/">Back to home</Link>
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="size-5 text-primary" aria-hidden /> Join{" "}
                  {invitation.businessName}
                </CardTitle>
                <CardDescription>
                  {invitation.inviterName ? `${invitation.inviterName} invited you` : "You were invited"}{" "}
                  to join as a <Badge variant="outline">{ROLE_LABELS[invitation.role]}</Badge> on
                  CampaignHub.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MailCheck className="size-4" aria-hidden /> Invitation sent to
                  </p>
                  <p className="font-medium">{invitation.email}</p>
                  {invitation.expiresAt && (
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDateTime(invitation.expiresAt)}
                    </p>
                  )}
                </div>

                {session?.user ? (
                  <AcceptInviteButton
                    token={token}
                    invitationEmail={invitation.email}
                    signedInEmail={session.user.email ?? null}
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sign in (or create an account with {invitation.email}) to accept this
                      invitation.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild className="flex-1">
                        <Link
                          href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                        >
                          Sign in
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="flex-1">
                        <Link
                          href={`/register?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                        >
                          Create account
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
