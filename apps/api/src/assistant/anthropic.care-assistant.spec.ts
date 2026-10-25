import { claudeCostUsd, claudePrice } from '../costs/prices.js';
import {
  AnthropicCareAssistant,
  modelFeatures,
} from './anthropic.care-assistant.js';

const context = { nickname: 'Limoncuk', city: 'İzmir' };
const history = [{ role: 'user' as const, content: 'Ne zaman sulayayım?' }];

describe('Claude models', () => {
  it('sends no fallbacks and no mid-conversation system message to Haiku 5.5', () => {
    expect(modelFeatures('claude-haiku-5-5')).toEqual({
      serverFallback: false,
      systemMessages: false,
    });
    expect(modelFeatures('claude-sonnet-5')).toEqual({
      serverFallback: true,
      systemMessages: false,
    });
    for (const model of ['claude-opus-5-5', 'claude-sonnet-5-5']) {
      expect(modelFeatures(model)).toEqual({
        serverFallback: true,
        systemMessages: true,
      });
    }
  });

  it('puts the plant facts where each model takes them', () => {
    const opus = new AnthropicCareAssistant('key', 'claude-opus-5-5');
    expect(opus.messages(history, context)).toEqual([
      { role: 'user', content: 'Ne zaman sulayayım?' },
      {
        role: 'system',
        content: expect.stringMatching(/^Bitki bilgisi:\nTakma ad: Limoncuk/),
      },
    ]);
    const haiku = new AnthropicCareAssistant('key', 'claude-haiku-5-5');
    expect(haiku.messages(history, context)).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Ne zaman sulayayım?' },
          {
            type: 'text',
            text: expect.stringMatching(
              /^<bilgi>\nBitki bilgisi:[\s\S]*Şehir: İzmir\n<\/bilgi>$/,
            ),
          },
        ],
      },
    ]);
    expect(haiku.messages(history, null)).toEqual(history);
  });

  it('prices calls by model, dearest when unknown', () => {
    const usage = {
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      cacheReadTokens: 2_000_000,
      cacheWriteTokens: 0,
    };
    expect(claudeCostUsd('claude-haiku-5-5', usage)).toBeCloseTo(
      0.1 + 0.05 + 0.02,
    );
    expect(claudeCostUsd('claude-opus-5-5-20261001', usage)).toBeCloseTo(
      4 + 2 + 0.4,
    );
    expect(claudePrice('claude-next-model').known).toBe(false);
    expect(claudeCostUsd('claude-next-model', usage)).toBeCloseTo(6.4);
  });
});
