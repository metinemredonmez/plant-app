'use client';

import { useActionState } from 'react';

import { signIn } from '@/app/actions';
import { Notice, SubmitButton } from '@/components/forms';

export default function LoginForm({ next }: { next: string }) {
  const [state, run] = useActionState(signIn, {});
  return (
    <form action={run} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="space-y-1 text-sm">
        <span>E-posta</span>
        <input name="email" type="email" autoComplete="username" defaultValue={String(state.values?.email ?? '')} required />
      </label>
      <label className="space-y-1 text-sm">
        <span>Parola</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <Notice state={state} />
      <SubmitButton>Giriş yap</SubmitButton>
    </form>
  );
}
