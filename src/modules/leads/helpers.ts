import type { LeadStatus } from "@prisma/client"

/**
 * Pure helpers for the leads module. Kept free of Prisma/database imports so
 * they can be unit-tested and reused by client components.
 */

/** 24 hours, used for the soft duplicate check on public enquiries. */
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Hard cap for CSV exports so an unfiltered export cannot exhaust memory. */
export const LEAD_EXPORT_LIMIT = 5000

/**
 * Normalises an Indian phone number for storage and duplicate matching:
 * digits only, leading zeros dropped, 10-digit numbers prefixed with 91.
 * Seeded demo leads are stored as `919845123456`, so new enquiries match them.
 */
export function normalisePhone(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "")
  if (digits.startsWith("91")) {
    const local = digits.slice(2).replace(/^0+/, "")
    if (local.length === 10) return `91${local}`
  }
  if (digits.length === 10) return `91${digits}`
  return digits
}

/** Short reference shown to the visitor and used in notifications. */
export function leadReference(id: string): string {
  return `ENQ-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
}

export interface LeadStatusFields {
  status: LeadStatus
  lastContactedAt?: Date
  /** Always written: clearing the opposite outcome is part of reversing a status. */
  convertedAt: Date | null
  lostAt: Date | null
}

/**
 * Extra timestamp columns implied by a status change. Only one of the outcome
 * timestamps may be set, so moving a lead out of CONVERTED/LOST clears it.
 */
export function statusUpdateFields(status: LeadStatus, now: Date): LeadStatusFields {
  return {
    status,
    ...(status === "CONTACTED" ? { lastContactedAt: now } : {}),
    convertedAt: status === "CONVERTED" ? now : null,
    lostAt: status === "LOST" ? now : null,
  }
}

/**
 * Accepts a date-only input (shown in IST) or a full ISO timestamp. Date-only
 * values are scheduled for 09:00 IST so follow-ups land in working hours.
 */
export function parseFollowUpDate(value: string): Date | null {
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T09:00:00.000+05:30`
    : value
  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? null : date
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** Start of the current day in IST, as a UTC instant. */
export function startOfTodayIst(now: Date = new Date()): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  return new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS,
  )
}

/** Inclusive start of an IST calendar day for list filters. */
export function startOfDayIst(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000+05:30`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Inclusive end of an IST calendar day for list filters. */
export function endOfDayIst(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T23:59:59.999+05:30`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** True when a scheduled follow-up is in the past. Kept out of component bodies. */
export function isFollowUpOverdue(date: Date | null, now: Date = new Date()): boolean {
  return date !== null && date.getTime() < now.getTime()
}

/**
 * CSV cell escaping: quote when needed and neutralise spreadsheet formulas
 * (`=`, `+`, `-`, `@`, tab, CR) by prefixing an apostrophe.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

/** Builds an RFC 4180-style CSV document (CRLF line endings, UTF-8 BOM). */
export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","))
  return `\uFEFF${lines.join("\r\n")}`
}
