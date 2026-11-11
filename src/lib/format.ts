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
