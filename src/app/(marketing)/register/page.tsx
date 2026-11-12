import type { Metadata } from "next"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = {
  title: "Create your account",
  description: "Register your business on CampaignHub and start your first campaign.",
}

/** Owner registration (Phase 2 task 2.1). Business details follow in onboarding. */
export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams
  const callbackUrl =
    typeof params.callbackUrl === "string" && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : undefined

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
      <div className="hidden space-y-4 lg:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Start free
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Launch a campaign page in minutes — no ad spend required.
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Create your account, add your business details, and publish a shareable
          promotional page. Enquiries land in a simple lead pipeline. A 14-day trial
          starts automatically; no payment details are needed.
        </p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <RegisterForm callbackUrl={callbackUrl} />
      </div>
    </div>
  )
}
