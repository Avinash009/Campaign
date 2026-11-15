import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OpenAiCompatibleProvider } from "./provider"

/**
 * Provider adapter tests. `fetch` is stubbed so no network call is made and no
 * credit is spent; the important contract is that every provider failure maps
 * to a specific, honest error code instead of returning made-up copy.
 */

const PROMPT = {
  system: "You write short advertising copy.",
  user: "Write three headlines.",
  maxTokens: 256,
}

const CONFIG = {
  apiKey: "sk-test-secret-value",
  baseUrl: "https://api.example.test/v1",
  model: "test-model",
  timeoutMs: 1_000,
}

function createProvider(overrides: Partial<typeof CONFIG> = {}) {
  return new OpenAiCompatibleProvider({ ...CONFIG, ...overrides })
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function completion(content: string): unknown {
  return { choices: [{ message: { content } }] }
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error("expected the promise to reject")
}

function codeOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code)
  }
  return "unexpected"
}

describe("OpenAiCompatibleProvider.completeJson", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("posts the prompt to the chat-completions endpoint and parses JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, completion('{"headlines":["Spacious homes"]}')))
    vi.stubGlobal("fetch", fetchMock)

    const result = await createProvider().completeJson(PROMPT)

    expect(result).toEqual({ headlines: ["Spacious homes"] })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.example.test/v1/chat/completions")
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${CONFIG.apiKey}`,
      "Content-Type": "application/json",
    })

    const body = JSON.parse(String(init.body)) as {
      model: string
      temperature: number
      max_tokens: number
      messages: { role: string; content: string }[]
    }
    expect(body.model).toBe(CONFIG.model)
    expect(body.max_tokens).toBe(PROMPT.maxTokens)
    expect(body.messages).toEqual([
      { role: "system", content: PROMPT.system },
      { role: "user", content: PROMPT.user },
    ])
  })

  it("tolerates a trailing slash on the configured base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, completion('{"a":1}')))
    vi.stubGlobal("fetch", fetchMock)

    await createProvider({ baseUrl: "https://api.example.test/v1///" }).completeJson(PROMPT)

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.test/v1/chat/completions")
  })

  it("unwraps markdown-fenced JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, completion('```json\n{"a":2}\n```'))),
    )

    await expect(createProvider().completeJson(PROMPT)).resolves.toEqual({ a: 2 })
  })

  it("maps a rejected key to ai_provider_auth without echoing the key", async () => {
    for (const status of [401, 403]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(status, {
            error: { message: "Incorrect API key provided: sk-test-secret-value", type: "invalid_request_error" },
          }),
        ),
      )

      const error = await rejection(createProvider().completeJson(PROMPT))
      expect(codeOf(error)).toBe("ai_provider_auth")
      expect((error as Error).message).not.toContain(CONFIG.apiKey)
      expect((error as { status?: number }).status).toBe(503)
    }
  })

  it.each([
    [{ type: "insufficient_quota", code: null }],
    [{ type: "insufficient_quota", code: "credit_balance_exhausted" }],
    [{ type: "invalid_request_error", code: "credit_balance_exhausted" }],
    [{ type: "invalid_request_error", code: "billing_hard_limit_reached" }],
  ])("maps an exhausted quota (%o) to ai_quota_exhausted", async (providerError) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(429, {
          error: { message: "You have no credits remaining.", ...providerError },
        }),
      ),
    )

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const error = await rejection(createProvider().completeJson(PROMPT))

    expect(codeOf(error)).toBe("ai_quota_exhausted")
    expect((error as Error).message).toContain("credits")
    const logged = String(warn.mock.calls[0]?.[0] ?? "")
    expect(logged).toContain("ai.provider_error")
    expect(logged).toContain("429")
  })

  it("maps a generic 429 to ai_provider_rate_limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(429, { error: { message: "Rate limit reached", type: "requests" } }),
      ),
    )

    const error = await rejection(createProvider().completeJson(PROMPT))
    expect(codeOf(error)).toBe("ai_provider_rate_limited")
  })

  it("maps any other provider status to ai_provider_error", async () => {
    for (const status of [400, 404, 500, 502]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(status, { error: { message: "boom" } })),
      )

      const error = await rejection(createProvider().completeJson(PROMPT))
      expect(codeOf(error)).toBe("ai_provider_error")
    }
  })

  it("survives a non-JSON error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 })),
    )

    const error = await rejection(createProvider().completeJson(PROMPT))
    expect(codeOf(error)).toBe("ai_provider_error")
  })

  it("rejects an empty completion instead of returning blank copy", async () => {
    for (const payload of [
      completion(""),
      completion("   "),
      { choices: [] },
      { choices: [{ message: {} }] },
      { choices: [{ message: { content: 42 } }] },
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, payload)))
      const error = await rejection(createProvider().completeJson(PROMPT))
      expect(codeOf(error)).toBe("ai_invalid_response")
    }
  })

  it("rejects unreadable completion text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, completion("I cannot help with that."))),
    )

    const error = await rejection(createProvider().completeJson(PROMPT))
    expect(codeOf(error)).toBe("ai_invalid_response")
  })

  it("maps an aborted request to ai_timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.reject(Object.assign(new Error("The operation was aborted."), { name: "AbortError" })),
      ),
    )

    const error = await rejection(createProvider().completeJson(PROMPT))
    expect(codeOf(error)).toBe("ai_timeout")
  })

  it("maps a network failure to ai_unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")))

    const error = await rejection(createProvider().completeJson(PROMPT))
    expect(codeOf(error)).toBe("ai_unavailable")
  })
})

describe("provider configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  /** Reloads the module so `getEnv()` re-reads the stubbed variables. */
  async function loadProviderModule(env: Record<string, string | undefined>) {
    vi.resetModules()
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
    return import("./provider")
  }

  it("reports generation as unconfigured when AI_PROVIDER is none", async () => {
    const ai = await loadProviderModule({ AI_PROVIDER: "none", AI_API_KEY: "sk-anything" })

    expect(ai.isAiConfigured()).toBe(false)
    const error = await rejection(Promise.resolve().then(() => ai.getAiProvider()))
    expect(codeOf(error)).toBe("ai_not_configured")
    expect((error as Error).message).toContain("AI_PROVIDER")
  })

  it("reports generation as unconfigured without an API key", async () => {
    const ai = await loadProviderModule({ AI_PROVIDER: "openai", AI_API_KEY: "" })

    expect(ai.isAiConfigured()).toBe(false)
    const error = await rejection(Promise.resolve().then(() => ai.getAiProvider()))
    expect(codeOf(error)).toBe("ai_not_configured")
    expect((error as Error).message).toContain("AI_API_KEY")
  })

  it("builds the OpenAI-compatible provider from the environment", async () => {
    const ai = await loadProviderModule({
      AI_PROVIDER: "openai",
      AI_API_KEY: "sk-from-env",
      AI_MODEL: "gpt-4o-mini",
      AI_BASE_URL: "https://api.example.test/v1",
      AI_TIMEOUT_MS: "5000",
    })

    expect(ai.isAiConfigured()).toBe(true)
    const provider = ai.getAiProvider()
    expect(provider.name).toBe("openai")
    expect(provider.model).toBe("gpt-4o-mini")
  })
})
