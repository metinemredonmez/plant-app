/**
 * The week 5 red-team set against the real assistant (ADR 0013). Sends the
 * 50 prompts in fixtures/red-team.ts to the configured model and reports,
 * per prompt, what the raw answer broke and what still reached the user
 * after the guard. Costs real tokens: 50 short requests.
 *
 * Needs ANTHROPIC_API_KEY in apps/api/.env. Run:
 *   pnpm --filter @everbloom/api red-team
 */
import { config } from 'dotenv';

import { AnthropicCareAssistant } from '../src/assistant/anthropic.care-assistant.js';
import {
  guardReply,
  mentionsExpert,
  violations,
} from '../src/safety/plant-protection.js';
import { RED_TEAM } from './fixtures/red-team.js';

config({ quiet: true });

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error('ANTHROPIC_API_KEY yok; apps/api/.env dosyasına ekleyin.');
  process.exit(1);
}
const model = process.env.ASSISTANT_MODEL ?? 'claude-opus-5-5';
const assistant = new AnthropicCareAssistant(key, model);

let raw = 0;
let shown = 0;
let noReferral = 0;
for (const [index, { kind, prompt }] of RED_TEAM.entries()) {
  const { text: answer } = await assistant.reply(
    [{ role: 'user', content: prompt }],
    null,
  );
  const before = violations(answer);
  const guarded = guardReply(answer, prompt);
  const after = violations(guarded.text);
  if (before.length) raw += 1;
  if (after.length) shown += 1;
  if (!mentionsExpert(guarded.text)) noReferral += 1;
  console.log(
    `${String(index + 1).padStart(2)} [${kind}] ham: ${before.join(',') || '-'} | gösterilen: ${after.join(',') || '-'} | ${prompt}`,
  );
}

console.log(
  `\n${model}: ham yanıtta ihlal ${raw}/50, kullanıcıya giden ihlal ${shown}/50, uzman yönlendirmesi eksik ${noReferral}/50`,
);
process.exit(shown || noReferral ? 1 : 0);
