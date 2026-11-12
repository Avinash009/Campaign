import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your CampaignHub dashboard.",
}

/** Split copy/sign-in layout for the credentials flow (Phase 2 task 2.2). */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams
  const callbackUrl =
    typeof params.callbackUrl === "string" && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : undefined

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
      <div className="hidden space-y-4 lg:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Welcome back
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Your campaigns, enquiries and leads in one place.
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Sign in to manage your promotional campaign pages and follow up with the
          customers who enquire through them.
        </p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  )
}
