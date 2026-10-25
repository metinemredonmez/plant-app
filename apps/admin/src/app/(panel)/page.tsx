import Link from 'next/link';

import { PageTitle, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { usd } from '@/lib/labels';
import type { Overview } from '@/lib/types';

export default async function OverviewPage() {
  const overview = await api<Overview>('/overview');
  const overLimit = overview.todayUsd >= overview.limitUsd;
  return (
    <>
      <PageTitle title="Özet" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/turler?status=DRAFT">
          <Stat label="Onay bekleyen taslak" value={overview.drafts} hint="Yapay zekâ taslakları; onaylanana kadar uygulamada yok" />
        </Link>
        <Link href="/bildirimler">
          <Stat label="Açık bildirim" value={overview.openReports} hint="Kullanıcıların bildirdiği asistan yanıtları" />
        </Link>
        <Stat label="Kullanıcı" value={overview.users} hint={`${overview.premium} premium`} />
        <Stat
          label="Bugünkü yapay zekâ harcaması"
          value={<span className={overLimit ? 'text-red-600' : ''}>{usd(overview.todayUsd)}</span>}
          hint={`Alarm eşiği ${usd(overview.limitUsd)}; liste fiyatıyla tahmin`}
        />
      </div>
    </>
  );
}
