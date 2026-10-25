'use client';

import { useActionState } from 'react';

import { draftSpecies } from '@/app/actions';
import { Notice, SubmitButton } from '@/components/forms';

export default function DraftForm() {
  const [state, run] = useActionState(draftSpecies, {});
  return (
    <form action={run} className="space-y-3">
      <label className="space-y-1 text-sm">
        <span className="font-medium">Bilimsel ad</span>
        <input name="scientificName" placeholder="Örn. Calathea orbifolia" defaultValue={String(state.values?.scientificName ?? '')} required />
      </label>
      <Notice state={state} />
      <SubmitButton tone="quiet">Yapay zekâ taslağı yaz</SubmitButton>
      <p className="text-xs text-slate-500">Taslak bir uzman onaylayana kadar uygulamada görünmez.</p>
    </form>
  );
}
