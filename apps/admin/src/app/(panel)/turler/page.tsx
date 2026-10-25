import Link from 'next/link';

import { Badge, Card, PageTitle, Table } from '@/components/ui';
import { api } from '@/lib/api';
import { when } from '@/lib/labels';
import type { SpeciesRow } from '@/lib/types';

import DraftForm from './draft-form';

export default async function SpeciesListPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = '', status = '' } = await searchParams;
  const query = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) });
  const rows = await api<SpeciesRow[]>(`/species?${query}`);
  return (
    <>
      <PageTitle title="Bakım kartları">
        <Link href="/turler/yeni" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Yeni tür ekle
        </Link>
      </PageTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Türkçe ya da bilimsel ad ara" />
            <select name="status" defaultValue={status} className="max-w-48">
              <option value="">Hepsi</option>
              <option value="DRAFT">Taslak</option>
              <option value="PUBLISHED">Yayında</option>
            </select>
            <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 text-sm">
              Ara
            </button>
          </form>
          <Table head={['Tür', 'Durum', 'Uzman onayı', 'Güncellendi']}>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/turler/${row.id}`} className="font-medium text-brand-700 hover:underline">
                    {row.turkishName}
                  </Link>
                  <p className="text-xs italic text-slate-500">{row.scientificName}</p>
                </td>
                <td className="px-4 py-3">{row.status === 'DRAFT' ? <Badge tone="amber">Taslak</Badge> : <Badge tone="green">Yayında</Badge>}</td>
                <td className="px-4 py-3">{row.reviewed ? <Badge tone="green">Onaylı</Badge> : <Badge>Bekliyor</Badge>}</td>
                <td className="px-4 py-3 text-slate-500">{when(row.updatedAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Sonuç yok
                </td>
              </tr>
            )}
          </Table>
        </div>
        <Card>
          <h2 className="mb-3 font-semibold">Taslakla başla</h2>
          <DraftForm />
        </Card>
      </div>
    </>
  );
}
