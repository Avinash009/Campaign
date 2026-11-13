"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch, errorMessage } from "@/lib/api-client"
import type { LeadAssignee } from "@/modules/leads/types"

interface LeadAssignFormProps {
  leadId: string
  assignedToId: string | null
  assignees: LeadAssignee[]
}

/** Owner/admin assignment. Members cannot reassign leads. */
export function LeadAssignForm({ leadId, assignedToId, assignees }: LeadAssignFormProps) {
  const router = useRouter()
  const [value, setValue] = useState(assignedToId ?? "unassigned")
  const [pending, setPending] = useState(false)

  if (assignees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Invite a teammate first — only active team members can be assigned leads.
      </p>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await apiFetch(`/api/leads/${leadId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ userId: value === "unassigned" ? null : value }),
      })
      toast.success(value === "unassigned" ? "Lead unassigned" : "Lead assigned")
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error, "Could not assign the lead."))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="space-y-1">
        <Label htmlFor="lead-assignee" className="text-xs text-muted-foreground">
          Assigned to
        </Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id="lead-assignee" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignees.map((assignee) => (
              <SelectItem key={assignee.id} value={assignee.id}>
                {assignee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={pending} variant="outline" className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "Saving…" : "Save assignment"}
      </Button>
    </form>
  )
}
