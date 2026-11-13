"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { LeadStatus } from "@prisma/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch, errorMessage } from "@/lib/api-client"
import { LEAD_STATUSES } from "@/modules/leads/schemas"
import { LEAD_STATUS_DESCRIPTIONS, LEAD_STATUS_LABELS } from "@/modules/leads/labels"

interface LeadStatusFormProps {
  leadId: string
  status: LeadStatus
  canEdit: boolean
}

/** Status change with an optional note; records a STATUS_CHANGED activity. */
export function LeadStatusForm({ leadId, status, canEdit }: LeadStatusFormProps) {
  const router = useRouter()
  const [nextStatus, setNextStatus] = useState<LeadStatus>(status)
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        Only the assigned teammate or an owner/admin can change this lead.
      </p>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await apiFetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, note }),
      })
      setNote("")
      toast.success("Lead status updated")
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the lead status."))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="space-y-1">
        <Label htmlFor="lead-status" className="text-xs text-muted-foreground">
          Status
        </Label>
        <Select
          value={nextStatus}
          onValueChange={(value) => setNextStatus(value as LeadStatus)}
        >
          <SelectTrigger id="lead-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {LEAD_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{LEAD_STATUS_DESCRIPTIONS[nextStatus]}</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="status-note" className="text-xs text-muted-foreground">
          Note (optional)
        </Label>
        <Textarea
          id="status-note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What happened on this call or message?"
          maxLength={1000}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "Updating…" : "Update status"}
      </Button>
    </form>
  )
}
