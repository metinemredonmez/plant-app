# EverBloom

Türkiye için yapay zekâlı bitki bakım uygulaması: fotoğrafla tanıma, Türkçe bakım kartları, teşhis, bitkiyi bilen bakım asistanı ve hatırlatıcılar. Ürün satışı yok; gelir yalnızca abonelikten geliyor. Expo mobil uygulaması, NestJS + Prisma API ve admin paneli.

- Araştırma ve 16 haftalık plan: [reports/Yapay zekâlı bitki uygulaması MVP planı.md](reports/Yapay%20zekâl%C4%B1%20bitki%20uygulamas%C4%B1%20MVP%20plan%C4%B1.md)
- Kapsam: [docs/kapsam.md](docs/kapsam.md)
- Haftalık durum: [docs/ilerleme.md](docs/ilerleme.md)
- Önceki ürün (bitki mağazası) `v0-ticaret` etiketinde.

| Klasör | İçerik |
|---|---|
| [apps/mobile](apps/mobile) | Eski Expo 50 mağaza uygulaması (EverBloom şablonu); yeni uygulama Expo 54 şablonlarından kuruluyor |
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
pnpm mock:api        # eski uygulama için: kalan uçlar API'den, sipariş, yorum ve promosyon mock'tan
pnpm mobile          # Expo/Metro (apps/mobile, yarn)
pnpm test            # sözleşme + API testleri
```

Eski mobil uygulama (`apps/mobile`, mağaza şablonu) `pnpm mock:api` ile çalışır: kimlik, kullanıcı ve katalog uçları API'den, sipariş, yorum ve promosyon uçları mock'tan gelir. Adres `apps/mobile/.env.local` içindeki `EXPO_PUBLIC_API_URL` ile seçilir (varsayılan mock, 4010). Yeni uygulamanın uçları `/api/v1` altında ([apps/api/README.md](apps/api/README.md)). Test hesabı `demo@everbloom.test` / `demo1234`; demo hesabın üç bitkisi var. API'de geliştirmede doğrulama kodları gönderilmez, API logunda görünür. Tanıma, teşhis ve asistan sahte sürücülerle anahtar olmadan çalışır.

Mobil uygulama yarn 1 kullanıyor (`apps/mobile/package.json` içinde `packageManager`); kökteki pnpm workspace'inin dışında.

## Kararlar

- [0001 Monorepo yapısı](docs/adr/0001-monorepo-yapisi.md)
- [0002 NestJS 12 + Prisma 7.10](docs/adr/0002-nestjs-12-ve-prisma-7.md)
- [0003 Eski API sözleşmesini korumak](docs/adr/0003-eski-sozlesme-uyumlulugu.md)
- [0004 Bağımlılıksız mock sunucu](docs/adr/0004-mock-sunucu.md)
- [0005 Expo SDK yükseltmesi](docs/adr/0005-expo-sdk-yukseltmesi.md) (ertelendi)
- [0006 Şema v1, katalog uçları ve API iskeleti](docs/adr/0006-sema-v1-ve-katalog.md)
- [0007 Oturumlar, yetkilendirme ve mobil token saklama](docs/adr/0007-oturum-ve-yetkilendirme.md)
- [0008 Doğrulama kodları, şifre sıfırlama, yorumlar, promosyonlar, Türkçe uyarlama](docs/adr/0008-otp-yorum-promosyon.md)
- [0009 Ürün yönü yapay zekâlı bitki bakımı; arka uçta ilk dilim](docs/adr/0009-yapay-zekali-bakim-uygulamasi.md)
