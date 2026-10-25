import { anonymizeUser } from '@/app/actions';
import { ActionButton } from '@/components/forms';
import { Badge, Card, PageTitle, Problem } from '@/components/ui';
import { load } from '@/lib/api';
import { ROLE, when } from '@/lib/labels';
import type { UserDetail } from '@/lib/types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await load<UserDetail>(`/users/${Number(id)}`);
  if ('error' in result) return <Problem message={result.error} />;
  const user = result.data;
  const subscription = user.subscription;
  return (
    <>
      <PageTitle title={user.anonymizedAt ? 'Anonim hesap' : user.name || 'Adsız kullanıcı'}>
        {user.anonymizedAt && <Badge tone="red">Anonimleştirildi · {when(user.anonymizedAt)}</Badge>}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">Hesap</h2>
          <Row label="E-posta">{user.email ?? '—'}</Row>
          <Row label="Kullanıcı kimliği">{user.publicId}</Row>
          <Row label="Rol">{ROLE[user.role]}</Row>
          <Row label="Giriş yolu">{user.signInMethod ?? '—'}</Row>
          <Row label="Şehir">{user.city ?? '—'}</Row>
          <Row label="Açıldı">{when(user.createdAt)}</Row>
          <Row label="Bitki / tarama / soru">
            {user.counts.plants} / {user.counts.scans} / {user.counts.messages}
          </Row>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Abonelik</h2>
          <p className="mb-2 text-xs text-slate-500">Salt okunur: mağaza ve RevenueCat esastır.</p>
          {subscription ? (
            <>
              <Row label="Durum">{subscription.active ? <Badge tone="green">Etkin</Badge> : <Badge>{subscription.status}</Badge>}</Row>
              <Row label="Ürün">{subscription.productId}</Row>
              <Row label="Mağaza">
                {subscription.store}
                {subscription.sandbox ? ' (sandbox)' : ''}
              </Row>
              <Row label="Bitiş">{when(subscription.expiresAt)}</Row>
              <Row label="Yenilenecek mi">{subscription.willRenew ? 'Evet' : 'Hayır'}</Row>
            </>
          ) : (
            <p className="text-sm">Abonelik yok; ücretsiz plan.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Onaylar</h2>
          {user.consents.length === 0 && <p className="text-sm text-slate-600">Kayıt yok.</p>}
          {user.consents.map((consent) => (
            <Row key={`${consent.kind}-${consent.createdAt}`} label={`${consent.kind} (${consent.textVersion})`}>
              {consent.granted ? 'Verdi' : 'Geri aldı'} · {when(consent.createdAt)}
            </Row>
          ))}
        </Card>
        {!user.anonymizedAt && user.role === 'CUSTOMER' && (
          <Card className="space-y-3">
            <h2 className="font-semibold">Anonimleştir</h2>
            <p className="text-sm text-slate-600">
              Kişisel veriler, bitkiler, taramalar, sohbetler ve fotoğraflar silinir; Apple erişimi iptal edilir. Geri alınamaz. KVKK silme
              talebinde ya da kişinin isteğiyle kullanın.
            </p>
            <ActionButton
              action={anonymizeUser.bind(null, user.id)}
              tone="danger"
              confirmText="Bu hesap kalıcı olarak anonimleştirilsin mi? Geri alınamaz."
            >
              Hesabı anonimleştir
            </ActionButton>
          </Card>
        )}
      </div>
    </>
  );
}
