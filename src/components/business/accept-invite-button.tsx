"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import { Check, Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch, errorMessage } from "@/lib/api-client"

interface AcceptInviteButtonProps {
  token: string
  invitationEmail: string
  signedInEmail: string | null
}

/**
 * Accepts a team invitation for the signed-in user. The API verifies that the
 * invitation email matches the session — we never let one account claim another
 * person's invite.
 */
export function AcceptInviteButton({
  token,
  invitationEmail,
  signedInEmail,
}: AcceptInviteButtonProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const matches =
    signedInEmail !== null && signedInEmail.toLowerCase() === invitationEmail.toLowerCase()

  async function accept() {
    setPending(true)
    setError(null)
    try {
      const result = await apiFetch<{ businessName: string }>(
        "/api/business/team/invite/accept",
        {
          method: "POST",
          body: JSON.stringify({ token }),
        },
      )
      toast.success(`You joined ${result.businessName}`)
      // Membership is read from the database on the dashboard, so the stale JWT
      // businessId does not matter here.
      router.push("/dashboard")
      router.refresh()
    } catch (caught) {
      setError(errorMessage(caught, "Could not accept the invitation. Please try again."))
      setPending(false)
    }
  }

  if (!matches) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          You are signed in as <strong>{signedInEmail ?? "another account"}</strong>, but this
          invitation was sent to <strong>{invitationEmail}</strong>.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            signOut({ redirectTo: `/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}` })
          }
        >
          <LogIn className="size-4" aria-hidden /> Sign in with {invitationEmail}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="button" className="w-full" onClick={() => void accept()} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Check className="size-4" aria-hidden />
        )}
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </div>
  )
}
