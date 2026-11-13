"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch, errorMessage } from "@/lib/api-client"

interface LeadNoteFormProps {
  leadId: string
}

/** Append a note to the lead timeline. */
export function LeadNoteForm({ leadId }: LeadNoteFormProps) {
  const router = useRouter()
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!note.trim()) {
      toast.error("Write a note before saving.")
      return
    }
    setPending(true)
    try {
      await apiFetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note }),
      })
      setNote("")
      toast.success("Note added")
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error, "Could not add the note."))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="space-y-2" onSubmit={submit}>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Add a note for your team — call summary, next step, preference…"
        aria-label="New note"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{note.length}/2000</p>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <StickyNote className="size-4" aria-hidden />
          )}
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  )
}
