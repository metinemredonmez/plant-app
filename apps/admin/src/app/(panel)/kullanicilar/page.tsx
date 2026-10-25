import Link from 'next/link';

import { Badge, PageTitle, Problem, Table } from '@/components/ui';
import { load } from '@/lib/api';
import { ROLE, when } from '@/lib/labels';
import type { UserRow } from '@/lib/types';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const result = await load<UserRow[]>(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  if ('error' in result) return <Problem message={result.error} />;
  return (
    <>
      <PageTitle title="Kullanıcılar" />
      <form className="mb-4 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} placeholder="E-posta, ad ya da kullanıcı kimliği" />
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 text-sm">
          Ara
        </button>
      </form>
      <p className="mb-4 text-xs text-slate-500">Telefon numaraları yalnız özet olarak saklandığı için numarayla arama yapılamaz.</p>
      <Table head={['Kişi', 'Giriş yolu', 'Plan', 'Açıldı', 'Durum']}>
        {result.data.map((user) => (
          <tr key={user.id} className="hover:bg-slate-50">
            <td className="px-4 py-3">
              <Link href={`/kullanicilar/${user.id}`} className="font-medium text-brand-700 hover:underline">
                {user.name || 'Adsız'}
              </Link>
              <p className="text-xs text-slate-500">{user.email ?? 'e-posta yok'}</p>
            </td>
            <td className="px-4 py-3">{user.signInMethod ?? '—'}</td>
            <td className="px-4 py-3">{user.premium ? <Badge tone="green">Premium</Badge> : <Badge>Ücretsiz</Badge>}</td>
            <td className="px-4 py-3 text-slate-500">{when(user.createdAt)}</td>
            <td className="px-4 py-3">
              {user.anonymizedAt ? <Badge tone="red">Anonim</Badge> : user.role !== 'CUSTOMER' ? <Badge tone="amber">{ROLE[user.role]}</Badge> : '—'}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
