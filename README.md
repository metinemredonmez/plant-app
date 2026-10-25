# EverBloom

Türkiye pazarı için bitki mağazası: Expo mobil uygulaması, NestJS + Prisma API ve admin paneli. Pazar araştırması ve 16 haftalık MVP takvimi [reports/](reports/) altında. Haftalık durum için [docs/ilerleme.md](docs/ilerleme.md).

| Klasör | İçerik |
|---|---|
| [apps/mobile](apps/mobile) | Expo 50 / React Native 0.73 uygulaması (şablon) |
| [apps/api](apps/api) | NestJS 12 + Prisma 7.10 REST API |
| [apps/admin](apps/admin) | Admin paneli (9. hafta) |
| [packages/contract](packages/contract) | API sözleşmesi, fikstürler ve mock sunucu |
| [docs/adr](docs/adr) | Mimari karar kayıtları |
| [docs/template](docs/template) | Şablonun Figma dosyası ve dokümanı |

## Hızlı başlangıç

Gereksinimler: Node 20.19+ (prod ve CI için 22 LTS), pnpm 9, yarn 1, PostgreSQL 15.

```bash
pnpm install
pnpm mock            # yalnızca mock API: http://localhost:4010
pnpm api:dev         # NestJS API: http://localhost:4100 (önce apps/api/README.md)
pnpm mock:api        # mock + API birlikte: katalog API'den, kalanı mock'tan
pnpm mobile          # Expo/Metro (apps/mobile, yarn)
pnpm test            # sözleşme + API testleri
```

Mobil uygulamanın hangi adrese bağlanacağı `apps/mobile/.env.local` içindeki `EXPO_PUBLIC_API_URL` ile seçiliyor (örnek: `apps/mobile/.env.example`). Varsayılan mock sunucu (4010). API henüz bütün uçları sunmadığı için (OTP, yorum, sipariş oluşturma 4–5. haftada) uygulama mock'a bağlı kalır; `pnpm mock:api` hazır uçları (katalog, oturum, kullanıcı, sipariş geçmişi) API'ye yönlendirir. Test hesabı hem mock'ta hem API seed'inde `demo@everbloom.test` / `demo1234`, mock'ta OTP `12345`.

Mobil uygulama yarn 1 kullanıyor (`apps/mobile/package.json` içinde `packageManager`); kökteki pnpm workspace'inin dışında.

## Kararlar

- [0001 Monorepo yapısı](docs/adr/0001-monorepo-yapisi.md)
- [0002 NestJS 12 + Prisma 7.10](docs/adr/0002-nestjs-12-ve-prisma-7.md)
- [0003 Eski API sözleşmesini korumak](docs/adr/0003-eski-sozlesme-uyumlulugu.md)
- [0004 Bağımlılıksız mock sunucu](docs/adr/0004-mock-sunucu.md)
- [0005 Expo SDK yükseltmesi](docs/adr/0005-expo-sdk-yukseltmesi.md) (ertelendi)
- [0006 Şema v1, katalog uçları ve API iskeleti](docs/adr/0006-sema-v1-ve-katalog.md)
- [0007 Oturumlar, yetkilendirme ve mobil token saklama](docs/adr/0007-oturum-ve-yetkilendirme.md)
