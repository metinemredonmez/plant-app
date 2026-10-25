import { PageTitle, Problem, Table } from '@/components/ui';
import { load } from '@/lib/api';
import { ACTION, when } from '@/lib/labels';
import type { AuditEntry } from '@/lib/types';

export default async function AuditPage() {
  const result = await load<AuditEntry[]>('/audit?take=200');
  if ('error' in result) return <Problem message={result.error} />;
  return (
    <>
      <PageTitle title="Denetim kaydı" />
      <p className="mb-4 text-sm text-slate-600">Paneldeki her yazma işlemi burada; kayıtlar değiştirilemez.</p>
      <Table head={['Zaman', 'Kim', 'İşlem', 'Kayıt', 'Ayrıntı']}>
        {result.data.map((entry) => (
          <tr key={entry.id}>
            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{when(entry.createdAt)}</td>
            <td className="px-4 py-3">{entry.actorEmail}</td>
            <td className="px-4 py-3">{ACTION[entry.action] ?? entry.action}</td>
            <td className="px-4 py-3">
              {entry.targetType} #{entry.targetId}
            </td>
            <td className="px-4 py-3 text-xs text-slate-500">{entry.details ? JSON.stringify(entry.details) : '—'}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
