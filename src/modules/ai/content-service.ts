import type {
  AiContentInput,
  AiContentService,
  AiGeneratedCopy,
  AiGeneratedLandingContent,
  AiLandingContentInput,
} from "./index"
import { normalizeGeneratedCopy, normalizeLandingContent } from "./parsing"
import { buildAdCopyPrompt, buildLandingContentPrompt } from "./prompts"
import { getAiProvider, type AiProvider } from "./provider"

/**
 * Provider-backed content generation. The factory resolves the env-configured
 * adapter, so callers never choose a provider themselves.
 */
export class ProviderAiContentService implements AiContentService {
  constructor(private readonly provider: AiProvider) {}

  async generateAdCopy(input: AiContentInput): Promise<AiGeneratedCopy> {
    const raw = await this.provider.completeJson(buildAdCopyPrompt(input))
    return normalizeGeneratedCopy(raw)
  }

  async generateLandingContent(
    input: AiLandingContentInput,
  ): Promise<AiGeneratedLandingContent> {
    const raw = await this.provider.completeJson(buildLandingContentPrompt(input))
    return normalizeLandingContent(raw)
  }
}

export function getAiContentService(): AiContentService {
  return new ProviderAiContentService(getAiProvider())
}
