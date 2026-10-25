/**
 * Week 6 model choice (ADR 0014). `run` asks each candidate model the 50
 * questions in fixtures/assistant-eval.ts and writes a blind sheet for the
 * graders (native speaker, agronomist); `score` reads a filled sheet back.
 * `run` costs real tokens: 50 questions per model.
 *
 * Needs ANTHROPIC_API_KEY in apps/api/.env. Run:
 *   pnpm --filter @everbloom/api assistant:eval run claude-haiku-5-5 claude-sonnet-5-5 claude-opus-5-5
 *   pnpm --filter @everbloom/api assistant:eval score eval-results/<folder> [sheet.csv]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { config } from 'dotenv';

import { AnthropicCareAssistant } from '../src/assistant/anthropic.care-assistant.js';
import { describeContext } from '../src/assistant/care-assistant.js';
import { guardReply, violations } from '../src/safety/plant-protection.js';
import {
  blind,
  parseCsv,
  PASS_SHARE,
  score,
  SHEET_HEADER,
  toCsv,
} from './eval/sheet.js';
import { ASSISTANT_EVAL } from './fixtures/assistant-eval.js';

config({ quiet: true });

const DEFAULT_MODELS = [
  'claude-haiku-5-5',
  'claude-sonnet-5-5',
  'claude-opus-5-5',
];

interface Measured {
  id: string;
  ms: number;
  /** What the raw answer broke before the guard. */
  rawViolations: string[];
  /** The plant's nickname appears when one was given. */
  usesName: boolean | null;
  failed?: string;
}

async function run(models: string[]) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error('ANTHROPIC_API_KEY yok; apps/api/.env dosyasına ekleyin.');
    process.exit(1);
  }
  const labels = blind(models);
  const assistants = Object.fromEntries(
    models.map((model) => [model, new AnthropicCareAssistant(key, model)]),
  );
  const folder = join(
    'eval-results',
    new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'),
  );
  await mkdir(folder, { recursive: true });

  const rows: string[][] = [[...SHEET_HEADER]];
  const measured: Record<string, Measured[]> = {};
  for (const q of ASSISTANT_EVAL) {
    const answers: { label: string; text: string }[] = [];
    for (const model of models) {
      const started = Date.now();
      let raw = '';
      let failed: string | undefined;
      try {
        raw = (
          await assistants[model].reply(
            [{ role: 'user', content: q.question }],
            q.context ?? null,
          )
        ).text;
      } catch (error) {
        failed = String(error);
      }
      const ms = Date.now() - started;
      // Graders see what a user would see.
      const shown = failed
        ? `(yanıt alınamadı: ${failed})`
        : guardReply(raw, q.question).text;
      answers.push({ label: labels[model], text: shown });
      (measured[model] ??= []).push({
        id: q.id,
        ms,
        rawViolations: violations(raw),
        usesName: q.context?.nickname ? raw.includes(q.context.nickname) : null,
        failed,
      });
      console.log(`${q.id} ${labels[model]} ${ms} ms${failed ? ' HATA' : ''}`);
    }
    answers.sort((a, b) => a.label.localeCompare(b.label));
    for (const answer of answers) {
      rows.push([
        q.id,
        q.topic,
        q.question,
        q.context ? describeContext(q.context).replace(/\n/g, ' | ') : '',
        q.focus,
        answer.label,
        answer.text,
        '',
        '',
        '',
        '',
      ]);
    }
  }
  await writeFile(join(folder, 'cevaplar.csv'), toCsv(rows));
  await writeFile(
    join(folder, 'anahtar.json'),
    JSON.stringify({ labels, measured }, null, 2),
  );
  console.log(
    `\n${folder}/cevaplar.csv puanlayıcılara; anahtar.json puanlama bitene kadar onlardan saklanır.`,
  );
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

async function scoreFolder(folder: string, sheet = 'cevaplar.csv') {
  const rows = parseCsv(await readFile(join(folder, sheet), 'utf8'));
  const { labels, measured } = JSON.parse(
    await readFile(join(folder, 'anahtar.json'), 'utf8'),
  ) as { labels: Record<string, string>; measured: Record<string, Measured[]> };
  console.log(`Eşik: %${PASS_SHARE * 100} "doğru ve güvenli"\n`);
  for (const result of score(rows, labels)) {
    const auto = measured[result.model] ?? [];
    const named = auto.filter((m) => m.usesName !== null);
    console.log(
      [
        `${result.model} (${labels[result.model]})`,
        `${result.graded}/${ASSISTANT_EVAL.length} puanlandı`,
        `doğru ve güvenli %${Math.round(result.correctAndSafe * 100)}${result.passes ? ' GEÇTİ' : ''}`,
        `Türkçe ${result.turkish?.toFixed(1) ?? '-'}`,
        `ham ihlal ${auto.filter((m) => m.rawViolations.length).length}`,
        `adı kullandı ${named.filter((m) => m.usesName).length}/${named.length}`,
        `ortanca ${median(auto.map((m) => m.ms))} ms`,
      ].join(' · '),
    );
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === 'run') {
  await run(args.length ? args : DEFAULT_MODELS);
} else if (command === 'score' && args[0]) {
  await scoreFolder(args[0], args[1]);
} else {
  console.error(
    'Kullanım: assistant:eval run [model …] | assistant:eval score <klasör> [sheet.csv]',
  );
  process.exit(1);
}
