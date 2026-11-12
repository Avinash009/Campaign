"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, Rocket } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { registerSchema } from "@/modules/auth/schemas"

const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, { error: "Re-enter your password." }),
    consent: z.boolean().refine((value) => value === true, {
      error: "Please confirm you agree before continuing.",
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match.",
  })

type RegisterFormValues = z.infer<typeof registerFormSchema>

interface RegisterFormProps {
  /** Internal path to continue to after signing in (e.g. an invite link). */
  callbackUrl?: string
}

export function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      consent: false,
    },
  })

  async function onSubmit(values: RegisterFormValues) {
    setPending(true)
    setFormError(null)

    try {
      await apiFetch<{ userId: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      })

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (!signInResult || signInResult.error) {
        toast.success("Account created. Please sign in.")
        const loginUrl = callbackUrl
          ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : "/login"
        window.location.assign(loginUrl)
        return
      }

      toast.success("Account created — let’s get you set up.")
      window.location.assign(callbackUrl ?? "/onboarding")
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field === "confirmPassword" || field === "consent") continue
          setError(field as keyof RegisterFormValues, { message: messages[0] })
        }
        setFormError(error.message)
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="size-5 text-primary" aria-hidden /> Create your account
        </CardTitle>
        <CardDescription>
          Start free. You will add your business details in the next step.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Sunitha Rao"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@business.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters, including a letter and a number.
            </p>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="consent" className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                id="consent"
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input accent-primary"
                aria-invalid={Boolean(errors.consent)}
                {...register("consent")}
              />
              <span>
                I agree to CampaignHub’s privacy notice. My details are used only to create and
                operate my account — we never ask for bank credentials or government IDs.
              </span>
            </label>
            {errors.consent && <p className="text-xs text-destructive">{errors.consent.message}</p>}
          </div>

          {formError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pending ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
