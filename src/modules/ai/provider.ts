import { ApiError } from "@/lib/errors"
import { getEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { parseJsonFromText } from "./parsing"
import type { AiPrompt } from "./prompts"

/**
 * Provider adapter for AI content generation.
 *
 * The MVP targets any OpenAI-compatible chat-completions endpoint (OpenAI
 * itself, a gateway, or a compatible local server). No SDK dependency: one
 * `fetch` call, strict timeout, and an explicit `ai_not_configured` error when
 * `AI_PROVIDER=none` or the key is missing. The app boots fine without AI.
 */

export interface AiProvider {
  readonly name: string
  readonly model: string
  completeJson(prompt: AiPrompt): Promise<unknown>
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: unknown } }[]
  error?: { message?: unknown; type?: unknown; code?: unknown }
}

/**
 * Maps a provider failure onto a specific, actionable 503 code. The message is
 * safe to show the user: it names configuration or billing problems without
 * echoing the provider payload or the API key.
 */
function providerFailure(
  status: number,
  error: ChatCompletionResponse["error"],
): ApiError {
  const type = typeof error?.type === "string" ? error.type : null
  const code = typeof error?.code === "string" ? error.code : null

  if (status === 401 || status === 403) {
    return ApiError.serviceUnavailable(
      "ai_provider_auth",
      "The AI provider rejected the configured API key. Check AI_API_KEY.",
    )
  }

  if (
    type === "insufficient_quota" ||
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted" ||
    code === "billing_hard_limit_reached"
  ) {
    return ApiError.serviceUnavailable(
      "ai_quota_exhausted",
      "The AI provider account has no credits or has reached its quota. Add credits in the provider dashboard and try again.",
    )
  }

  if (status === 429) {
    return ApiError.serviceUnavailable(
      "ai_provider_rate_limited",
      "The AI provider is rate limiting requests. Please try again shortly.",
    )
  }

  return ApiError.serviceUnavailable(
    "ai_provider_error",
    "The AI provider could not complete this request. Please try again.",
  )
}

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "openai"

  constructor(
    private readonly config: {
      apiKey: string
      baseUrl: string
      model: string
      timeoutMs: number
    },
  ) {}

  get model(): string {
    return this.config.model
  }

  async completeJson(prompt: AiPrompt): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(
        `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.config.model,
            temperature: 0.7,
            max_tokens: prompt.maxTokens,
            messages: [
              { role: "system", content: prompt.system },
              { role: "user", content: prompt.user },
            ],
          }),
          signal: controller.signal,
        },
      )

      const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null

      if (!response.ok) {
        logger.warn("ai.provider_error", {
          provider: this.name,
          model: this.config.model,
          status: response.status,
          errorType:
            typeof payload?.error?.type === "string" ? payload.error.type : undefined,
          errorCode:
            typeof payload?.error?.code === "string" ? payload.error.code : undefined,
        })
        throw providerFailure(response.status, payload?.error)
      }

      const content = payload?.choices?.[0]?.message?.content
      if (typeof content !== "string" || content.trim() === "") {
        logger.warn("ai.empty_response", {
          provider: this.name,
          model: this.config.model,
        })
        throw ApiError.serviceUnavailable(
          "ai_invalid_response",
          "The AI provider returned an empty response. Please try again.",
        )
      }

      return parseJsonFromText(content)
    } catch (error) {
      if (error instanceof ApiError) throw error

      const name = typeof error === "object" && error !== null ? (error as { name?: unknown }).name : null
      if (name === "AbortError") {
        throw ApiError.serviceUnavailable(
          "ai_timeout",
          "The AI provider took too long to respond. Please try again.",
        )
      }

      logger.error("ai.provider_unreachable", {
        provider: this.name,
        model: this.config.model,
        error: error instanceof Error ? error.message : String(error),
      })
      throw ApiError.serviceUnavailable(
        "ai_unavailable",
        "The AI provider is not reachable right now. Please try again.",
      )
    } finally {
      clearTimeout(timer)
    }
  }
}

/** True when generation is configured well enough to attempt a call. */
export function isAiConfigured(): boolean {
  const env = getEnv()
  return env.AI_PROVIDER !== "none" && Boolean(env.AI_API_KEY?.trim())
}

/**
 * Builds the configured provider or throws a clear not-configured error.
 * Never falls back to template text: that would be simulated AI.
 */
export function getAiProvider(): AiProvider {
  const env = getEnv()

  if (env.AI_PROVIDER === "none") {
    throw ApiError.serviceUnavailable(
      "ai_not_configured",
      "AI content generation is not configured on this deployment. Set AI_PROVIDER and AI_API_KEY to enable it.",
    )
  }

  const apiKey = env.AI_API_KEY?.trim()
  if (!apiKey) {
    throw ApiError.serviceUnavailable(
      "ai_not_configured",
      "AI content generation is missing an API key. Set AI_API_KEY to enable it.",
    )
  }

  switch (env.AI_PROVIDER) {
    case "openai":
      return new OpenAiCompatibleProvider({
        apiKey,
        baseUrl: env.AI_BASE_URL,
        model: env.AI_MODEL,
        timeoutMs: env.AI_TIMEOUT_MS,
      })
    default:
      throw ApiError.serviceUnavailable(
        "ai_not_configured",
        "The selected AI provider is not supported.",
      )
  }
}
