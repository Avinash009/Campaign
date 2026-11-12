"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Check, Copy, Loader2, MailPlus, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { inviteMemberSchema, type InviteMemberInput } from "@/modules/business/schemas"
import { formatDateTime } from "@/lib/format"

interface InviteResult {
  inviteUrl: string
  emailDelivered: boolean
  expiresAt: string
}

interface InviteMemberFormProps {
  canInvite: boolean
  seatLimit: number | null
  seatsUsed: number
}

/**
 * Team invitation form (Phase 2 task 2.5).
 * The console email transport cannot deliver mail, so on success we always show
 * the invite link and say plainly whether an email was sent.
 */
export function InviteMemberForm({ canInvite, seatLimit, seatsUsed }: InviteMemberFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "MEMBER" },
  })

  const seatsLeft = seatLimit === null ? null : Math.max(seatLimit - seatsUsed, 0)
  const atLimit = seatsLeft !== null && seatsLeft === 0

  async function onSubmit(input: InviteMemberInput) {
    setPending(true)
    setFormError(null)
    try {
      const response = await apiFetch<InviteResult>("/api/business/team/invite", {
        method: "POST",
        body: JSON.stringify(input),
      })
      setResult(response)
      reset({ email: "", role: input.role })
      router.refresh()
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message)
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setPending(false)
    }
  }

  async function copyLink() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.inviteUrl)
      setCopied(true)
      toast.success("Invite link copied")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy — select the link and copy it manually.")
    }
  }

  if (!canInvite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite teammates</CardTitle>
          <CardDescription>Only owners and admins can invite teammates.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (atLimit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team limit reached</CardTitle>
          <CardDescription>
            Your plan includes {seatLimit} team {seatLimit === 1 ? "member" : "members"}. Upgrade
            your plan to invite more people.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MailPlus className="size-5 text-primary" aria-hidden /> Invite a teammate
        </CardTitle>
        <CardDescription>
          They receive an invite link and join your business when they accept.
          {seatsLeft !== null && ` ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} available.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              placeholder="teammate@business.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor="invite-role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {pending ? "Inviting…" : "Send invite"}
          </Button>
        </form>

        {formError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        {result && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm font-medium">Invitation created</p>
            <p className="text-sm text-muted-foreground">
              {result.emailDelivered
                ? "An invitation email was sent."
                : "Email delivery is not configured in this environment, so nothing was emailed. Share this link with your teammate yourself."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-background px-2 py-1.5 text-xs">
                {result.inviteUrl}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
                {copied ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The link expires on {formatDateTime(new Date(result.expiresAt))}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
