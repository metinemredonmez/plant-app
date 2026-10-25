'use client';

import { useActionState } from 'react';

import type { FormState } from '@/app/actions';
import { DIFFICULTY, LIGHT, SPOTS } from '@/lib/labels';
import type { Species } from '@/lib/types';

import { Notice, SubmitButton } from './forms';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** Every field the app's care card shows; lists one item per line. */
export default function SpeciesForm({
  action,
  species,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  species?: Species;
  submitLabel: string;
}) {
  const [state, run] = useActionState(action, {});
  // After a refused save, what was typed; otherwise the stored card.
  const sent = state.values;
  const text = (name: string, stored: string | number | null | undefined, fallback: string | number = '') =>
    sent ? String(sent[name] ?? '') : (stored ?? fallback);
  const list = (name: string, stored: string[] | undefined) => (sent ? String(sent[name] ?? '') : (stored ?? []).join('\n'));
  const spots = sent ? ((sent.spots as string[] | undefined) ?? []) : (species?.spots ?? ['INDOOR']);
  const toxic = sent
    ? String(sent.toxicToPets ?? 'unknown')
    : species?.toxicToPets === true
      ? 'yes'
      : species?.toxicToPets === false
        ? 'no'
        : 'unknown';
  return (
    <form action={run} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Bilimsel ad">
          <input name="scientificName" defaultValue={text('scientificName', species?.scientificName)} required />
        </Field>
        <Field label="Türkçe ad">
          <input name="turkishName" defaultValue={text('turkishName', species?.turkishName)} required />
        </Field>
        <Field label="Diğer Türkçe adlar" hint="Her satıra bir ad">
          <textarea name="otherNames" rows={3} defaultValue={list('otherNames', species?.otherNames)} />
        </Field>
        <Field label="Eş anlamlı bilimsel adlar" hint="Tanıma sonucunu bu karta eşler; her satıra bir ad">
          <textarea name="synonyms" rows={3} defaultValue={list('synonyms', species?.synonyms)} />
        </Field>
        <Field label="Familya">
          <input name="family" defaultValue={text('family', species?.family)} />
        </Field>
        <Field label="Kaynak" hint="Bilginin nereden geldiği">
          <input name="source" defaultValue={text('source', species?.source)} required />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Işık">
          <select name="light" defaultValue={text('light', species?.light, 'BRIGHT_INDIRECT')}>
            {Object.entries(LIGHT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zorluk">
          <select name="difficulty" defaultValue={text('difficulty', species?.difficulty, 'EASY')}>
            {Object.entries(DIFFICULTY).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nem">
          <select name="humidity" defaultValue={text('humidity', species?.humidity, 'orta')}>
            <option value="düşük">Düşük</option>
            <option value="orta">Orta</option>
            <option value="yüksek">Yüksek</option>
          </select>
        </Field>
        <Field label="Yaz sulama aralığı (gün)">
          <input name="waterSummerDays" type="number" min={1} max={90} defaultValue={text('waterSummerDays', species?.waterSummerDays, 7)} required />
        </Field>
        <Field label="Kış sulama aralığı (gün)">
          <input name="waterWinterDays" type="number" min={1} max={120} defaultValue={text('waterWinterDays', species?.waterWinterDays, 12)} required />
        </Field>
        <div className="space-y-1 text-sm">
          <span className="font-medium">Yetiştiği yerler</span>
          <div className="flex gap-4 pt-2">
            {Object.entries(SPOTS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1">
                <input type="checkbox" name="spots" value={value} defaultChecked={spots.includes(value)} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <Field label="En düşük sıcaklık (°C)" hint="Balkon don eşiği">
          <input name="tempMinC" type="number" min={-30} max={30} defaultValue={text('tempMinC', species?.tempMinC, 10)} required />
        </Field>
        <Field label="En yüksek sıcaklık (°C)" hint="Balkon sıcak eşiği">
          <input name="tempMaxC" type="number" min={0} max={50} defaultValue={text('tempMaxC', species?.tempMaxC, 30)} required />
        </Field>
        <Field label="Evcil hayvanlar için zehirli mi?">
          <select name="toxicToPets" defaultValue={toxic}>
            <option value="unknown">Bilinmiyor</option>
            <option value="yes">Evet</option>
            <option value="no">Hayır</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Özet">
          <textarea name="summary" rows={3} defaultValue={text('summary', species?.summary)} required />
        </Field>
        <Field label="Zehirlilik notu">
          <textarea name="toxicityNote" rows={3} defaultValue={text('toxicityNote', species?.toxicityNote)} />
        </Field>
        <Field label="Sulama önerisi">
          <textarea name="wateringTip" rows={2} defaultValue={text('wateringTip', species?.wateringTip)} required />
        </Field>
        <Field label="Işık önerisi">
          <textarea name="lightTip" rows={2} defaultValue={text('lightTip', species?.lightTip)} required />
        </Field>
        <Field label="Gübre önerisi">
          <textarea name="fertilizingTip" rows={2} defaultValue={text('fertilizingTip', species?.fertilizingTip)} required />
        </Field>
        <Field label="Sık sorunlar" hint="Her satıra bir sorun; ürün adı, doz ya da ilaçlama zamanı yazılamaz">
          <textarea name="commonProblems" rows={4} defaultValue={list('commonProblems', species?.commonProblems)} />
        </Field>
      </div>

      <Notice state={state} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
