import Link from 'next/link';

import { signOut } from '@/app/actions';
import { api } from '@/lib/api';
import { ROLE } from '@/lib/labels';
import type { Me } from '@/lib/types';

const NAV = [
  { href: '/', label: 'Özet', owner: false },
  { href: '/turler', label: 'Bakım kartları', owner: false },
  { href: '/bildirimler', label: 'Bildirilen yanıtlar', owner: false },
  { href: '/kullanicilar', label: 'Kullanıcılar', owner: true },
  { href: '/maliyet', label: 'Maliyet', owner: true },
  { href: '/denetim', label: 'Denetim kaydı', owner: true },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await api<Me>('/me');
  const owner = me.role === 'ADMIN';
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-brand-900 px-4 py-6 text-white">
        <p className="px-3 text-xs font-semibold tracking-widest text-brand-100">EVERBLOOM</p>
        <p className="mb-6 px-3 text-lg font-semibold">Yönetim</p>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          {NAV.filter((item) => owner || !item.owner).map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 hover:bg-white/10">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 pt-4 text-xs text-brand-100">
          <p className="truncate text-white">{me.name}</p>
          <p className="truncate">{me.email}</p>
          <p className="mb-3">{ROLE[me.role]}</p>
          <form action={signOut}>
            <button type="submit" className="underline">
              Çıkış yap
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
