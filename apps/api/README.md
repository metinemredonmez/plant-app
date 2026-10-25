# @everbloom/api

NestJS 12 + Prisma 7.10 REST API. Eski Expo sözleşmesini (`/api/...`) birebir uyguluyor. 3. hafta itibarıyla katalog, oturumlar, kullanıcı uçları ve sipariş geçmişi hazır. Kararlar için [ADR 0002](../../docs/adr/0002-nestjs-12-ve-prisma-7.md), [ADR 0006](../../docs/adr/0006-sema-v1-ve-katalog.md) ve [ADR 0007](../../docs/adr/0007-oturum-ve-yetkilendirme.md).

## Kurulum

```bash
cp .env.example .env            # USER ve JWT_SECRET'ı doldurun
createdb -h localhost everbloom_dev
createdb -h localhost everbloom_test
pnpm install                    # postinstall Prisma istemcisini üretir
pnpm db:migrate                 # prisma migrate dev
pnpm db:seed                    # katalog + demo hesap ve siparişleri
pnpm start:dev                  # http://localhost:4100
```

Seed tekrar tekrar çalıştırılabilir. Kayıtları doğal anahtarlarıyla (isim, slug, kod, e-posta) günceller, hiçbir şey silmez. Slayt ve banner yalnızca tablo boşsa, demo siparişler yalnızca demo hesabın hiç siparişi yoksa eklenir; demo hesabın parolası da sonradan değiştirildiyse sıfırlanmaz. Veriler [prisma/seed-data.ts](prisma/seed-data.ts) içinde. Demo hesap: `demo@everbloom.test` / `demo1234`, e-postası ve telefonu doğrulanmış.

## Ortam değişkenleri

Uygulama açılışta hepsini doğrular ([src/config/env.ts](src/config/env.ts)).

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DATABASE_URL` | evet | PostgreSQL adresi, kullanıcı adı açık yazılmalı |
| `ASSET_BASE_URL` | evet | Görsel anahtarlarının ekleneceği adres (geliştirmede `http://localhost:4100/images`) |
| `JWT_SECRET` | evet | En az 32 karakter; `openssl rand -base64 48` ile üretin |
| `LOCAL_ASSET_DIR` | hayır | Verilirse bu klasördeki görseller `/images` altında sunulur |
| `ACCESS_TOKEN_TTL_SECONDS` | hayır | Erişim token'ı ömrü, varsayılan 900 (15 dk) |
| `REFRESH_TOKEN_TTL_DAYS` | hayır | Yenileme token'ı ömrü, varsayılan 30 |
| `AUTH_RATE_LIMIT` | hayır | Giriş, kayıt ve yenileme için IP başına dakikalık sınır, varsayılan 10 |
| `PORT` | hayır | Varsayılan 4100 |
| `NODE_ENV` | hayır | `development` ise loglar okunaklı tek satır; `production` ise `trust proxy` açık |
| `LOG_LEVEL` | hayır | Varsayılan `info` |

## Uçlar

Her uç varsayılan olarak oturum (`Authorization: Bearer <token>`) ister. Açık olanlar aşağıda "açık" diye işaretli.

| Uç | Erişim | Açıklama |
|---|---|---|
| `GET /health` | açık | Prisma üzerinden veritabanını yoklar; veritabanı yoksa 503 |
| `GET /api/plants`, `/categories`, `/colors`, `/pot/types`, `/plant/types`, `/slides`, `/banners`, `/promocodes` | açık | Katalog; çıplak diziler. Bitkiler yalnızca aktif ve stokta olanlar; promosyonlar yalnızca herkese açık ve geçerli olanlar |
| `POST /api/user/create` | açık, rate limit | Kayıt → `{user, token, refreshToken}`; 409 kayıtlı e-posta, 422 geçersiz gövde |
| `POST /api/user/login` | açık, rate limit | Giriş → `{user, token, refreshToken}`; 401 |
| `POST /api/auth/refresh` | açık, rate limit | Yenileme token'ını yeni bir çiftle değiştirir; tekrar kullanılan token bütün oturumu iptal eder |
| `POST /api/auth/logout` | açık | Yenileme token'ını iptal eder, her zaman 200 |
| `GET /api/user/:id` | yalnızca kendi hesabı | Çıplak kullanıcı nesnesi; başka id 403, silinmiş hesap 404 |
| `PUT /api/user/update/:id` | yalnızca kendi hesabı | `{name, location}` → `{user}` |
| `DELETE /api/user/delete/:id` | yalnızca kendi hesabı | Kişisel verileri siler, oturumları kapatır |
| `GET /api/order/:userId` | yalnızca kendi hesabı | `{orders}`; satır `id`'si bitki id'si |

Liste uçlarının hepsi çıplak JSON dizisi döndürür. Eski POST uçları 200 döner (`@LegacyPost`). Her hata `{message}` biçimindedir.

## Uygulamayı API'ye bağlamak

OTP, yorum, promosyon kodu sorgulama, sipariş oluşturma ve şifre değiştirme uçları henüz yok (4–5. hafta). O zamana kadar uygulama mock sunucuya bağlı kalır ve mock, hazır uçları API'ye yönlendirir:

```bash
pnpm api:dev        # kökten: API, 4100
pnpm mock:api       # kökten: mock 4010, hazır uçlar API'ye
```

## Testler

```bash
pnpm test        # birim testleri + e2e
pnpm test:e2e    # yalnızca e2e
```

e2e testleri `DATABASE_URL`'deki veritabanının `_test` sonekli kopyasını kullanır (`everbloom_dev` → `everbloom_test`). Başka bir adres için `TEST_DATABASE_URL` verin. Kurulum yalnızca bekleyen migration'ları uygular ve seed'i çalıştırır, hiçbir veriyi silmez. Testler her çalıştırmada benzersiz e-postalarla yeni test hesapları açar. Sözleşme snapshot'ları `test/__snapshots__` altında; bilinçli bir sözleşme değişikliğinden sonra `pnpm test:e2e -u` ile güncellenir.

## Notlar

- Prisma sürümleri tam sabit (`7.10.1`). CLI'ın "8.0.0-rc güncellemesi var" uyarısını dikkate almayın.
- Prisma yapılandırması `prisma7.config.ts` içinde. Prisma 7 `.env`'i kendisi yüklemiyor, dosya bunu `dotenv` ile yapıyor.
- Üretilen istemci `src/generated/prisma` altında ve git'e girmiyor.
- Prisma 7.10, `migrate reset` komutunu yapay zekâ ajanlarından gelince kullanıcı onayı olmadan çalıştırmıyor. Test kurulumu bu yüzden veri silmeyen `migrate deploy` kullanıyor.
