'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import type { FormState } from '@/app/actions';

export function SubmitButton({ children, tone = 'primary' }: { children: React.ReactNode; tone?: 'primary' | 'quiet' | 'danger' }) {
  const { pending } = useFormStatus();
  const tones = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    quiet: 'border border-slate-300 bg-white hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button type="submit" disabled={pending} className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${tones[tone]}`}>
      {pending ? 'Bekleyin…' : children}
    </button>
  );
}

export function Notice({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.ok}</p>;
  return null;
}

/** One button that runs a server action, after a confirm() when asked. */
export function ActionButton({
  action,
  children,
  confirmText,
  tone = 'quiet',
}: {
  action: (state: FormState) => Promise<FormState>;
  children: React.ReactNode;
  confirmText?: string;
  tone?: 'primary' | 'quiet' | 'danger';
}) {
  const [state, run] = useActionState(action, {});
  return (
    <form
      action={run}
      onSubmit={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <SubmitButton tone={tone}>{children}</SubmitButton>
      <Notice state={state} />
    </form>
  );
}
