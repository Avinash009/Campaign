"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Pencil, Plus, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client"
import { planFormSchema, type PlanFormValues } from "@/modules/admin/schemas"
import type { PlatformPlanItem } from "@/modules/admin/types"

interface PlanManagerProps {
  plans: PlatformPlanItem[]
}

const INTERVAL_LABELS = {
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
} as const

function formatPrice(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function formatLimit(value: number | null): string {
  return value === null ? "Unlimited" : String(value)
}

/** Subscription plan management (Phase 6 task 6.3). */
export function PlanManager({ plans }: PlanManagerProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformPlanItem | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(plan: PlatformPlanItem) {
    setEditing(plan)
    setFormOpen(true)
  }

  async function toggleActive(plan: PlatformPlanItem) {
    setPendingId(plan.id)
    try {
      await apiFetch(`/api/admin/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !plan.isActive }),
      })
      toast.success(
        plan.isActive
          ? `${plan.name} deactivated — hidden from pricing and new subscriptions`
          : `${plan.name} activated`,
      )
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the plan. Please try again."))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Subscription plans</CardTitle>
            <CardDescription>
              Prices are stored as integer paise (never floats). Deactivating hides a plan from
              the public pricing page and blocks new subscriptions on it.
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="size-4" aria-hidden /> Add plan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead className="text-right">Subscribers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{plan.name}</p>
                        {plan.isFeatured && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            <Star className="size-3" aria-hidden /> Featured
                          </Badge>
                        )}
                      </div>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        /{plan.slug}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatPrice(plan.amountInPaise)}
                    <span className="text-muted-foreground">
                      {" "}/ {INTERVAL_LABELS[plan.interval].toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatLimit(plan.campaignLimit)} campaigns · {formatLimit(plan.memberLimit)}{" "}
                    members
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{plan.subscriberCount}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        plan.isActive
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-secondary text-secondary-foreground"
                      }
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                        <Pencil className="size-4" aria-hidden /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingId === plan.id}
                        onClick={() => void toggleActive(plan)}
                      >
                        {pendingId === plan.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : null}
                        {plan.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <PlanFormDialog
        key={editing?.id ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editing}
      />
    </Card>
  )
}

function PlanFormDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlatformPlanItem | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: plan?.name ?? "",
      slug: plan?.slug ?? "",
      description: plan?.description ?? "",
      amountRupees: plan ? String(plan.amountInPaise / 100) : "",
      interval: plan?.interval ?? "MONTHLY",
      campaignLimit: plan?.campaignLimit === null || plan?.campaignLimit === undefined ? "" : String(plan.campaignLimit),
      memberLimit: plan?.memberLimit === null || plan?.memberLimit === undefined ? "" : String(plan.memberLimit),
      featuresText: plan ? plan.features.join("\n") : "",
      isFeatured: plan?.isFeatured ?? false,
      isActive: plan?.isActive ?? true,
      sortOrder: plan?.sortOrder ?? 0,
    },
  })

  async function onSubmit(values: PlanFormValues) {
    setPending(true)
    setFormError(null)
    try {
      await apiFetch(plan ? `/api/admin/plans/${plan.id}` : "/api/admin/plans", {
        method: plan ? "PATCH" : "POST",
        body: JSON.stringify(values),
      })
      toast.success(plan ? "Plan updated" : "Plan created")
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          setError(field as keyof PlanFormValues, { message: messages[0] })
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit plan" : "Add plan"}</DialogTitle>
          <DialogDescription>
            {plan
              ? "Changes apply to the pricing page immediately. Existing subscriptions keep their recorded plan."
              : "New plans appear on the pricing page once active."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                placeholder="e.g. Growth"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-slug">Slug (optional)</Label>
              <Input
                id="plan-slug"
                placeholder="auto-generated from the name"
                aria-invalid={Boolean(errors.slug)}
                {...register("slug")}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              rows={2}
              placeholder="Who is this plan for?"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-amount">Price (₹ per interval)</Label>
              <Input
                id="plan-amount"
                inputMode="numeric"
                placeholder="999"
                aria-invalid={Boolean(errors.amountRupees)}
                {...register("amountRupees")}
              />
              {errors.amountRupees && (
                <p className="text-xs text-destructive">{errors.amountRupees.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-interval">Billing interval</Label>
              <Controller
                control={control}
                name="interval"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="plan-interval" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-campaign-limit">Campaign limit</Label>
              <Input
                id="plan-campaign-limit"
                inputMode="numeric"
                placeholder="Blank = unlimited"
                aria-invalid={Boolean(errors.campaignLimit)}
                {...register("campaignLimit")}
              />
              {errors.campaignLimit && (
                <p className="text-xs text-destructive">{errors.campaignLimit.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-member-limit">Team member limit</Label>
              <Input
                id="plan-member-limit"
                inputMode="numeric"
                placeholder="Blank = unlimited"
                aria-invalid={Boolean(errors.memberLimit)}
                {...register("memberLimit")}
              />
              {errors.memberLimit && (
                <p className="text-xs text-destructive">{errors.memberLimit.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-features">Features</Label>
            <Textarea
              id="plan-features"
              rows={4}
              placeholder={"One feature per line, e.g.\n5 active campaigns\nAnalytics & CSV export"}
              aria-invalid={Boolean(errors.featuresText)}
              {...register("featuresText")}
            />
            <p className="text-xs text-muted-foreground">
              One per line or comma separated (max 12).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="plan-order">Sort order</Label>
              <Input
                id="plan-order"
                type="number"
                min={0}
                max={999}
                aria-invalid={Boolean(errors.sortOrder)}
                {...register("sortOrder", { valueAsNumber: true })}
              />
              {errors.sortOrder && (
                <p className="text-xs text-destructive">{errors.sortOrder.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pb-2">
              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <Switch
                    id="plan-featured"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="plan-featured">Featured</Label>
            </div>

            <div className="flex items-center gap-2 pb-2">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch id="plan-active" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="plan-active">Active</Label>
            </div>
          </div>

          {formError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {pending ? "Saving…" : plan ? "Save changes" : "Add plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
