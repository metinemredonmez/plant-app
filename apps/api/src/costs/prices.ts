/**
 * List prices in USD per million tokens (Claude API, October 2026). Cache
 * writes are priced at 1.25× input (5-minute cache). Estimates for the
 * admin cost page and the spend alarm; the invoice is what counts.
 */
export interface TokenPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const price = (input: number, output: number, cacheRead: number) => ({
  input,
  output,
  cacheRead,
  cacheWrite: input * 1.25,
});

export const CLAUDE_PRICES: Record<string, TokenPrice> = {
  'claude-opus-5-5': price(4, 20, 0.2),
  'claude-sonnet-5-5': price(2, 10, 0.2),
  // Up to 100K prompt tokens; chat turns stay far below that.
  'claude-haiku-5-5': price(0.1, 0.5, 0.01),
};

/** An unknown model is priced like the dearest one, so the alarm errs high. */
const FALLBACK = CLAUDE_PRICES['claude-opus-5-5'];

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

/** Model ids may carry a date suffix ("claude-haiku-5-5-20261001"). */
export function claudePrice(model: string) {
  const known = Object.keys(CLAUDE_PRICES).find((id) => model.startsWith(id));
  return { price: known ? CLAUDE_PRICES[known] : FALLBACK, known: !!known };
}

export function claudeCostUsd(model: string, usage: TokenUsage) {
  const { price: p } = claudePrice(model);
  return (
    (usage.inputTokens * p.input +
      usage.outputTokens * p.output +
      (usage.cacheReadTokens ?? 0) * p.cacheRead +
      (usage.cacheWriteTokens ?? 0) * p.cacheWrite) /
    1_000_000
  );
}
