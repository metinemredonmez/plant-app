import { createSpecies } from '@/app/actions';
import SpeciesForm from '@/components/species-form';
import { Card, PageTitle } from '@/components/ui';

export default function NewSpeciesPage() {
  return (
    <>
      <PageTitle title="Yeni tür" />
      <Card>
        <p className="mb-6 text-sm text-slate-600">
          Kaydedince tür uygulamada hemen görünür; uzman onayı verilene kadar kartta &quot;uzman onayı bekliyor&quot; yazar.
        </p>
        <SpeciesForm action={createSpecies} submitLabel="Kaydet ve yayınla" />
      </Card>
    </>
  );
}
