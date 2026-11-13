/** Human-friendly formatting helpers (en-IN locale, IST timezone). */

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  })}`
}

/** Digits only — used for `tel:` and `wa.me` links. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/**
 * Formats a stored phone number for display. Leads are stored as digits (with
 * the 91 country code for Indian numbers), so `919845123456` reads as
 * `+91 98451 23456`.
 */
export function formatPhone(value: string): string {
  const digits = phoneDigits(value)
  if (digits.length === 0) return value
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (value.trim().startsWith("+")) return value.trim()
  return `+${digits}`
}

/** Click-to-call link. CampaignHub never places the call itself. */
export function phoneTelHref(value: string): string {
  const digits = phoneDigits(value)
  return digits ? `tel:+${digits}` : `tel:${value}`
}

/** Opens WhatsApp with the number prefilled; no message is sent by CampaignHub. */
export function phoneWhatsAppHref(value: string): string {
  const digits = phoneDigits(value)
  if (digits.length === 10) return `https://wa.me/91${digits}`
  return `https://wa.me/${digits}`
}
