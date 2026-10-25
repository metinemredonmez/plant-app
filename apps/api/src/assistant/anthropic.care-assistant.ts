import Anthropic from '@anthropic-ai/sdk';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { Logger } from '@nestjs/common';

import {
  AssistantUnavailableError,
  CareAssistant,
  type ChatTurn,
  describeContext,
  type PlantContext,
  type Reply,
  SYSTEM_PROMPT,
} from './care-assistant.js';

const REFUSED =
  'Bu soruya yanıt veremiyorum. Bitkinizin bakımıyla ilgili başka bir şey sorabilirsiniz.';

/**
 * What the model accepts (Claude API model notes, October 2026). Haiku 5.5
 * has no server-side fallback (a `fallbacks` list is a 400) and takes no
 * mid-conversation system message; neither does Sonnet 5 before 5.5.
 */
export function modelFeatures(model: string) {
  const haiku = model.startsWith('claude-haiku-');
  const sonnet5 = /^claude-sonnet-5(?!-5)/.test(model);
  return { serverFallback: !haiku, systemMessages: !haiku && !sonnet5 };
}

/**
 * Claude Messages API through the official SDK. The stable system prompt is
 * cached; the plant's facts go after the question so the cached prefix
 * stays intact: as a mid-conversation system message where the model takes
 * one, otherwise as a tagged text block in the user's turn. Server-side
 * fallbacks re-run a declined request on Anthropic's recommended model.
 */
export class AnthropicCareAssistant extends CareAssistant {
  readonly name = 'anthropic';
  private readonly logger = new Logger('AnthropicCareAssistant');
  private readonly client: Anthropic;
  private readonly features: ReturnType<typeof modelFeatures>;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    super();
    this.client = new Anthropic({ apiKey, timeout: 60_000 });
    this.features = modelFeatures(model);
  }

  /** The conversation with the plant's facts placed for this model. */
  messages(history: ChatTurn[], context: PlantContext | null) {
    const messages: BetaMessageParam[] = history.map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));
    if (!context) return messages;
    const facts = describeContext(context);
    if (this.features.systemMessages) {
      messages.push({ role: 'system', content: facts });
    } else {
      const last = history.at(-1)!;
      messages[messages.length - 1] = {
        role: 'user',
        content: [
          { type: 'text', text: last.content },
          { type: 'text', text: `<bilgi>\n${facts}\n</bilgi>` },
        ],
      };
    }
    return messages;
  }

  async reply(
    history: ChatTurn[],
    context: PlantContext | null,
  ): Promise<Reply> {
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 8000,
        ...(this.features.serverFallback
          ? {
              betas: ['server-side-fallback-2026-07-01'],
              fallbacks: 'default' as const,
            }
          : {}),
        // Chat answers are short; low effort keeps latency and cost down.
        output_config: { effort: 'low' },
        cache_control: { type: 'ephemeral' },
        system: SYSTEM_PROMPT,
        messages: this.messages(history, context),
      });
      const usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      };
      if (response.stop_reason === 'refusal') {
        this.logger.warn(
          `refused: ${response.stop_details?.category ?? 'unknown'}`,
        );
        return { text: REFUSED, model: response.model, usage };
      }
      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
      if (!text) throw new AssistantUnavailableError('empty answer');
      return { text, model: response.model, usage };
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
