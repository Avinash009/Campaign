import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MegaphoneOff } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <MegaphoneOff className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
