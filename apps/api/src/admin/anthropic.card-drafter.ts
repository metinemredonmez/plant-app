import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import {
  CardDrafter,
  CardDraftError,
  cardDraftSchema,
  type Drafted,
  DRAFT_PROMPT,
} from './card-drafter.js';

/**
 * A care card draft through structured outputs: the API returns JSON that
 * matches cardDraftSchema. The admin service then checks the ranges, filters
 * plant protection text and stores it as a DRAFT for an expert.
 */
export class AnthropicCardDrafter extends CardDrafter {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    super();
    this.client = new Anthropic({ apiKey, timeout: 120_000 });
  }

  async draft(scientificName: string): Promise<Drafted> {
    let response;
    try {
      response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 8000,
        system: DRAFT_PROMPT,
        messages: [{ role: 'user', content: `Bilimsel ad: ${scientificName}` }],
        output_config: { format: zodOutputFormat(cardDraftSchema) },
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new CardDraftError(`Claude API ${error.status}`);
      }
      throw error;
    }
    if (response.stop_reason === 'refusal') {
      throw new CardDraftError('refused');
    }
    if (!response.parsed_output) throw new CardDraftError('no card');
    return {
      card: response.parsed_output,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    };
  }
}
