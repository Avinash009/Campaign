"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Pencil, Plus } from "lucide-react"
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
import { IndustryIcon } from "@/components/shared/industry-icon"
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client"
import {
  industryFormSchema,
  type IndustryFormValues,
} from "@/modules/admin/schemas"
import type { PlatformIndustryItem } from "@/modules/admin/types"

interface IndustryManagerProps {
  industries: PlatformIndustryItem[]
}

/** Industry catalog management (Phase 6 task 6.2). */
export function IndustryManager({ industries }: IndustryManagerProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformIndustryItem | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(industry: PlatformIndustryItem) {
    setEditing(industry)
    setFormOpen(true)
  }

  async function toggleActive(industry: PlatformIndustryItem) {
    setPendingId(industry.id)
    try {
      await apiFetch(`/api/admin/industries/${industry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !industry.isActive }),
      })
      toast.success(
        industry.isActive
          ? `${industry.name} deactivated — hidden from onboarding and marketing pages`
          : `${industry.name} activated`,
      )
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the industry. Please try again."))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Industry catalog</CardTitle>
            <CardDescription>
              Industries are database rows. Adding one never needs a code change — unknown icon
              keys fall back to a generic icon.
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="size-4" aria-hidden /> Add industry
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Industry</TableHead>
                <TableHead className="text-right">Businesses</TableHead>
                <TableHead className="text-right">Campaigns</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {industries.map((industry) => (
                <TableRow key={industry.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <IndustryIcon iconKey={industry.iconKey} className="size-4" />
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-medium">{industry.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          /{industry.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{industry.businessCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{industry.campaignCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{industry.sortOrder}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        industry.isActive
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-secondary text-secondary-foreground"
                      }
                    >
                      {industry.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(industry)}>
                        <Pencil className="size-4" aria-hidden /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingId === industry.id}
                        onClick={() => void toggleActive(industry)}
                      >
                        {pendingId === industry.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : null}
                        {industry.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <IndustryFormDialog
        key={editing?.id ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        industry={editing}
      />
    </Card>
  )
}

function IndustryFormDialog({
  open,
  onOpenChange,
  industry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  industry: PlatformIndustryItem | null
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
  } = useForm<IndustryFormValues>({
    resolver: zodResolver(industryFormSchema),
    defaultValues: {
      name: industry?.name ?? "",
      slug: industry?.slug ?? "",
      description: industry?.description ?? "",
      iconKey: industry?.iconKey ?? "",
      sortOrder: industry?.sortOrder ?? 0,
      isActive: industry?.isActive ?? true,
    },
  })

  async function onSubmit(values: IndustryFormValues) {
    setPending(true)
    setFormError(null)
    try {
      await apiFetch(
        industry ? `/api/admin/industries/${industry.id}` : "/api/admin/industries",
        {
          method: industry ? "PATCH" : "POST",
          body: JSON.stringify(values),
        },
      )
      toast.success(industry ? "Industry updated" : "Industry added")
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          setError(field as keyof IndustryFormValues, { message: messages[0] })
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{industry ? "Edit industry" : "Add industry"}</DialogTitle>
          <DialogDescription>
            {industry
              ? "Changes apply to new onboarding choices and marketing pages immediately."
              : "Businesses can pick this industry during onboarding once it is active."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="industry-name">Name</Label>
            <Input
              id="industry-name"
              placeholder="e.g. Hospitality"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="industry-slug">Slug (optional)</Label>
              <Input
                id="industry-slug"
                placeholder="auto-generated from the name"
                aria-invalid={Boolean(errors.slug)}
                {...register("slug")}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="industry-icon">Icon key (optional)</Label>
              <Input
                id="industry-icon"
                placeholder="e.g. real-estate"
                aria-invalid={Boolean(errors.iconKey)}
                {...register("iconKey")}
              />
              {errors.iconKey && (
                <p className="text-xs text-destructive">{errors.iconKey.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industry-description">Description</Label>
            <Textarea
              id="industry-description"
              rows={2}
              placeholder="One line shown on the industries page."
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="industry-order">Sort order</Label>
              <Input
                id="industry-order"
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
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="industry-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="industry-active">Active</Label>
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
              {pending ? "Saving…" : industry ? "Save changes" : "Add industry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
