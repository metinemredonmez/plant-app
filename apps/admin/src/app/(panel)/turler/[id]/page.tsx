import { approveSpecies, unpublishSpecies, updateSpecies } from '@/app/actions';
import { ActionButton } from '@/components/forms';
import SpeciesForm from '@/components/species-form';
import { Badge, Card, PageTitle, Problem } from '@/components/ui';
import { load } from '@/lib/api';
import { when } from '@/lib/labels';
import type { Species } from '@/lib/types';

export default async function SpeciesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kaydedildi?: string }>;
}) {
  const { id } = await params;
  const { kaydedildi } = await searchParams;
  const result = await load<Species>(`/species/${Number(id)}`);
  if ('error' in result) return <Problem message={result.error} />;
  const species = result.data;
  return (
    <>
      <PageTitle title={species.turkishName}>
        <div className="flex items-center gap-2">
          {species.status === 'DRAFT' ? <Badge tone="amber">Taslak: uygulamada yok</Badge> : <Badge tone="green">Yayında</Badge>}
          {species.reviewed ? <Badge tone="green">Uzman onaylı · {when(species.reviewedAt)}</Badge> : <Badge>Uzman onayı bekliyor</Badge>}
        </div>
      </PageTitle>
      {kaydedildi && <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">Kaydedildi; tür uygulamada görünüyor.</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
        <Card>
          <SpeciesForm action={updateSpecies.bind(null, species.id)} species={species} submitLabel="Değişiklikleri kaydet" />
        </Card>
        <Card className="h-fit space-y-4">
          <h2 className="font-semibold">Uzman onayı</h2>
          <p className="text-sm text-slate-600">Bütün alanları kontrol ettiysen onayla: kart yayınlanır ve &quot;uzman onaylı&quot; görünür.</p>
          {!species.reviewed && (
            <ActionButton action={approveSpecies.bind(null, species.id)} tone="primary">
              Onayla ve yayınla
            </ActionButton>
          )}
          {species.status === 'PUBLISHED' && (
            <ActionButton action={unpublishSpecies.bind(null, species.id)} confirmText="Tür uygulamadan kaldırılsın mı?">
              Yayından kaldır
            </ActionButton>
          )}
          <p className="text-xs text-slate-500">Kaynak: {species.source}</p>
        </Card>
      </div>
    </>
  );
}
