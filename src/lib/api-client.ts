/**
 * Small client-side fetch wrapper for form submissions. Parses the API error
 * envelope (docs/API.md §1) so forms can show inline field errors and a toast.
 */

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string[]>

  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

interface ErrorEnvelope {
  error?: {
    code?: string
    message?: string
    details?: Record<string, string[] | undefined>
  }
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(url, { ...init, headers })
  const payload = (await response.json().catch(() => null)) as (T & ErrorEnvelope) | null

  if (!response.ok) {
    const details = payload?.error?.details ?? {}
    const fieldErrors: Record<string, string[]> = {}
    for (const [field, messages] of Object.entries(details)) {
      if (messages?.length) fieldErrors[field] = messages
    }
    throw new ApiClientError(
      response.status,
      payload?.error?.code ?? "request_failed",
      payload?.error?.message ?? "Something went wrong. Please try again.",
      fieldErrors,
    )
  }

  return payload as T
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback
}
