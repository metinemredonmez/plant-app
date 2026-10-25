import { safeNext } from '@/lib/cookies';

import LoginForm from './login-form';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-widest text-brand-600">EVERBLOOM</p>
        <h1 className="mt-1 mb-6 text-2xl font-semibold">Yönetim paneli</h1>
        <LoginForm next={safeNext(next)} />
        <p className="mt-6 text-xs text-slate-500">Yalnız yönetici ve uzman hesapları girebilir.</p>
      </div>
    </main>
  );
}
