import Link from 'next/link';

import { Badge, Card, PageTitle } from '@/components/ui';
import { api } from '@/lib/api';
import { REPORT_REASON, when } from '@/lib/labels';
import type { Report } from '@/lib/types';

import ResolveForm from './resolve-form';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const closed = (await searchParams).state === 'closed';
  const reports = await api<Report[]>(`/reports?state=${closed ? 'closed' : 'open'}`);
  return (
    <>
      <PageTitle title="Bildirilen yanıtlar">
        <div className="flex gap-2 text-sm">
          <Link href="/bildirimler" className={closed ? 'underline' : 'font-semibold'}>
            Açık
          </Link>
          <Link href="/bildirimler?state=closed" className={closed ? 'font-semibold' : 'underline'}>
            Kapatılan
          </Link>
        </div>
      </PageTitle>
      <div className="space-y-4">
        {reports.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">{closed ? 'Kapatılmış bildirim yok.' : 'Açık bildirim yok.'}</p>
          </Card>
        )}
        {reports.map((report) => (
          <Card key={report.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge tone={report.reason === 'UNSAFE' ? 'red' : 'amber'}>{REPORT_REASON[report.reason ?? 'OTHER']}</Badge>
              <span>{when(report.reportedAt)}</span>
              {report.plant && <span>· Bitki: {report.plant}</span>}
              <span>· Kullanıcı {report.user.slice(0, 8)}</span>
            </div>
            {report.question && (
              <div>
                <p className="text-xs font-medium text-slate-500">Soru</p>
                <p className="text-sm">{report.question}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-slate-500">Asistanın yanıtı</p>
              <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm">{report.answer}</p>
            </div>
            {report.note && <p className="text-sm text-slate-700">Kullanıcının notu: {report.note}</p>}
            {closed ? (
              <p className="text-sm text-brand-700">
                Kapatıldı ({when(report.resolvedAt)}): {report.resolution}
              </p>
            ) : (
              <ResolveForm id={report.id} />
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
