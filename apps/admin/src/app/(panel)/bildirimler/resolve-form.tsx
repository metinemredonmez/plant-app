'use client';

import { useActionState } from 'react';

import { resolveReport } from '@/app/actions';
import { Notice, SubmitButton } from '@/components/forms';

export default function ResolveForm({ id }: { id: number }) {
  const [state, run] = useActionState(resolveReport.bind(null, id), {});
  if (state.ok) return <Notice state={state} />;
  return (
    <form action={run} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <input
        name="resolution"
        placeholder="Ne yapıldı? Örn. istem düzeltildi, süzgece kural eklendi"
        defaultValue={String(state.values?.resolution ?? '')}
        required
        minLength={2}
      />
      <SubmitButton tone="quiet">Kapat</SubmitButton>
      <Notice state={state} />
    </form>
  );
}
