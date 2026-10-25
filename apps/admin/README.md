# apps/admin

EverBloom yönetim paneli: Next.js 16 (App Router) ve Tailwind 4 ([ADR 0015](../../docs/adr/0015-admin-paneli.md)).

- **Bakım kartları:** tür ekleme ve düzenleme, yapay zekâ taslağı, uzman onayı.
- **Bildirilen yanıtlar:** asistan yanıtlarının kuyruğu.
- **Kullanıcılar:** görüntüleme, abonelik durumu (salt okunur) ve anonimleştirme.
- **Maliyet:** günlük özet ve alarm eşiği.
- **Denetim kaydı.**

Panel API'nin `/api/v1/admin/*` uçlarına yalnız kendi sunucusundan bağlanır; tarayıcı API'yi hiç çağırmaz. Oturum iki çerezde durur: HttpOnly, SameSite=Strict, üretimde Secure, 12 saat. `src/proxy.ts` süresi dolmak üzere olan erişim token'ını yeniler. Asıl yetki kontrolü API'de: müşteri token'ı 403 alır.

```bash
pnpm --filter @everbloom/admin dev     # http://localhost:4200 (API 4100'de çalışmalı)
pnpm --filter @everbloom/admin test    # çerez ve oturum testleri
pnpm --filter @everbloom/admin build
```

| Değişken | Açıklama |
|---|---|
| `ADMIN_API_URL` | API adresi, varsayılan `http://localhost:4100/api` |

Geliştirmede seed bir yönetici hesabı açar (`apps/api/prisma/seed-data.ts`, `adminUser`). Üretimde seed bu hesabı açmaz; sahip kendi hesabına veritabanında `ADMIN` (uzman için `STAFF`) rolü verir.

Roller:
- **ADMIN** her sayfayı görür.
- **STAFF** (uzman) bakım kartlarını ve bildirimleri yönetir; kullanıcı, maliyet ve denetim sayfaları ona kapalı.
