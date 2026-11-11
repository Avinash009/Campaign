"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the error for server logs / monitoring.
    console.error(JSON.stringify({ level: "error", message: "ui.error_boundary", digest: error.digest, error: error.message }))
  }, [error])

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again — if it keeps happening, contact support.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
