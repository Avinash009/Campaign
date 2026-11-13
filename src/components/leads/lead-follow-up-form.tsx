"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarCheck2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch, errorMessage } from "@/lib/api-client"

interface LeadFollowUpFormProps {
  leadId: string
  nextFollowUpAt: Date | null
  canEdit: boolean
}

/** IST calendar date for `<input type="date">`. */
function istDateInput(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/** Schedule, reschedule or complete a follow-up. */
export function LeadFollowUpForm({
  leadId,
  nextFollowUpAt,
  canEdit,
}: LeadFollowUpFormProps) {
  const router = useRouter()
  const [scheduledFor, setScheduledFor] = useState(
    nextFollowUpAt ? istDateInput(nextFollowUpAt) : "",
  )
  const [note, setNote] = useState("")
  const [pending, setPending] = useState<"schedule" | "complete" | null>(null)

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        Only the assigned teammate or an owner/admin can manage follow-ups.
      </p>
    )
  }

  async function schedule(event: React.FormEvent) {
    event.preventDefault()
    if (!scheduledFor) {
      toast.error("Choose a follow-up date.")
      return
    }
    setPending("schedule")
    try {
      await apiFetch(`/api/leads/${leadId}/follow-up`, {
        method: "POST",
        body: JSON.stringify({ scheduledFor, note }),
      })
      setNote("")
      toast.success("Follow-up scheduled")
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error, "Could not schedule the follow-up."))
    } finally {
      setPending(null)
    }
  }

  async function complete() {
    setPending("complete")
    try {
      await apiFetch(`/api/leads/${leadId}/follow-up/complete`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      toast.success("Follow-up marked complete")
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error, "Could not complete the follow-up."))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={schedule}>
        <div className="space-y-1">
          <Label htmlFor="follow-up-date" className="text-xs text-muted-foreground">
            {nextFollowUpAt ? "Reschedule to" : "Follow-up date"}
          </Label>
          <Input
            id="follow-up-date"
            type="date"
            value={scheduledFor}
            min={istDateInput(new Date())}
            onChange={(event) => setScheduledFor(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="follow-up-note" className="text-xs text-muted-foreground">
            Note (optional)
          </Label>
          <Textarea
            id="follow-up-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What will you discuss next?"
            maxLength={1000}
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending !== null} className="w-full">
          {pending === "schedule" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {pending === "schedule"
            ? "Scheduling…"
            : nextFollowUpAt
              ? "Reschedule follow-up"
              : "Schedule follow-up"}
        </Button>
      </form>

      {nextFollowUpAt && (
        <div className="border-t border-border pt-3">
          <Button
            type="button"
            onClick={complete}
            disabled={pending !== null}
            className="w-full"
          >
            {pending === "complete" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <CalendarCheck2 className="size-4" aria-hidden />
            )}
            {pending === "complete" ? "Saving…" : "Mark follow-up done"}
          </Button>
        </div>
      )}
    </div>
  )
}
