import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';

import {
  AssistantUnavailableError,
  CareAssistant,
  type ChatTurn,
  describeContext,
  type PlantContext,
  SYSTEM_PROMPT,
} from './care-assistant.js';

const REFUSED =
  'Bu soruya yanıt veremiyorum. Bitkinizin bakımıyla ilgili başka bir şey sorabilirsiniz.';

/**
 * Claude Messages API through the official SDK. The stable system prompt is
 * cached; the plant's facts go in a mid-conversation system message after
 * the question so the cached prefix stays intact. Server-side fallbacks
 * re-run a declined request on Anthropic's recommended model.
 */
export class AnthropicCareAssistant extends CareAssistant {
  readonly name = 'anthropic';
  private readonly logger = new Logger('AnthropicCareAssistant');
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    super();
    this.client = new Anthropic({ apiKey, timeout: 60_000 });
  }

  async reply(history: ChatTurn[], context: PlantContext | null) {
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 8000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        // Chat answers are short; low effort keeps latency and cost down.
        output_config: { effort: 'low' },
        cache_control: { type: 'ephemeral' },
        system: SYSTEM_PROMPT,
        messages: [
          ...history.map((turn) => ({
            role: turn.role,
            content: turn.content,
          })),
          ...(context
            ? [{ role: 'system' as const, content: describeContext(context) }]
            : []),
        ],
      });
      if (response.stop_reason === 'refusal') {
        this.logger.warn(
          `refused: ${response.stop_details?.category ?? 'unknown'}`,
        );
        return REFUSED;
      }
      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
      if (!text) throw new AssistantUnavailableError('empty answer');
      return text;
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new AssistantUnavailableError('rate limited');
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new AssistantUnavailableError('unreachable');
      }
      if (error instanceof Anthropic.APIError) {
        this.logger.error(`Claude API ${error.status}: ${error.message}`);
        throw new AssistantUnavailableError(`HTTP ${error.status}`);
      }
      throw error;
    }
  }
}
