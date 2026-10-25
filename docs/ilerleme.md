# İlerleme

Takvim: [reports/Bitki mağazası pazar ve MVP planı.md](../reports/Bitki%20mağazası%20pazar%20ve%20MVP%20planı.md), "Hafta hafta plan" bölümü. Bu dosya her haftanın sonunda güncellenir.

## Özet

| Hafta | Tarih | Durum |
|---|---|---|
| 1 | 26 Eki–1 Kas | Teknik işler tamam; dış işler sahipte |
| 2 | 2–8 Kas | Şema v1 ve katalog tamam; CI yazıldı ama çalıştırılmadı; staging ve Sentry hesap bekliyor |
| 3 | 9–15 Kas | Tamam: oturumlar, IDOR düzeltmesi, rate limit, mobil güvenli token; kabul kriterleri sağlandı |
| 4 | 16–22 Kas | Sırada: OTP (e-posta, SMS), şifre sıfırlama, yorumlar, promosyon doğrulama, Türkçe uyarlama; sonunda kapsam dondurma |

## 1. hafta

Tamamlanan:
- Monorepo: `apps/mobile` (şablon), `apps/api`, `apps/admin` (yer tutucu), `packages/contract` ([ADR 0001](adr/0001-monorepo-yapisi.md))
- 23 ucun sözleşmesi, zod şemaları, Türkçe fikstürler ve mock sunucu ([ADR 0003](adr/0003-eski-sozlesme-uyumlulugu.md), [ADR 0004](adr/0004-mock-sunucu.md))
- NestJS 12 + Prisma 7.10 spike'ı: ESM/CJS sorunu yok ([ADR 0002](adr/0002-nestjs-12-ve-prisma-7.md))
- Uygulama simülatörde mock'a bağlı açılıyor; giriş, ana sayfa ve ürün sayfası çalışıyor
- Expo 50 mağaza kontrolü: iki mağazaya da gönderilemiyor. Yükseltme sahibinin kararıyla ertelendi, en geç 11. haftada yapılmalı ([ADR 0005](adr/0005-expo-sdk-yukseltmesi.md))

Sahipte bekleyen dış işler: şirket, KEP, alan adı, iyzico ve PayTR başvuruları, Netgsm başlığı, Paraşüt, ETBİS, avukat metinleri, İl Tarım Müdürlüğü'ne soru, tedarikçi görüşmeleri, Geliver, Apple ve Google geliştirici hesapları, KVKK aktarım planı.

## 2. hafta

Tamamlanan ([ADR 0006](adr/0006-sema-v1-ve-katalog.md)):
- Prisma şeması v1: raporun 20 modeli, snake_case tablolar, kuruş cinsinden para, bitki `slug`'ı, görsel anahtarları
- İdempotent Türkçe seed: 41 bitki (her boy ayrı kayıt, biri bilerek stoksuz), 7 kategori, 6 renk, 4 saksı ve 6 bitki tipi, slaytlar, banner, 3 promosyon kodu
- API iskeleti: zod ile ortam doğrulaması, nestjs-pino (yetki başlıkları maskeli), her hatada `{message}`, geliştirmede görsel sunumu
- 8 katalog ucu: `plants`, `categories`, `colors`, `pot/types`, `plant/types`, `slides`, `banners`, `promocodes`
- Testler: eşleyici birim testleri (7), API e2e (25, 8 snapshot), sözleşme ve mock (44)
- Mock'ta upstream modu: uygulama katalogu gerçek API'den alıyor, giriş ve kullanıcı uçları mock'ta
- Kabul kriteri simülatörde doğrulandı: ana sayfa, kategoriler, mağaza ve filtre ekranları API verisiyle doluyor
- Bağımlılıklar güncellendi: vitest 5, dotenv 18, `@types/node` 22

Açık:
- GitHub Actions iş akışı yazıldı ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) ama proje henüz bir git deposu değil; ilk push'ta çalışacak. `apps/mobile/.git` sorunu için [ADR 0001](adr/0001-monorepo-yapisi.md).
- Railway + Neon staging ve Sentry: sahibin hesabı gerekiyor.

4. haftaya not: Şablonun `uppercase`/`capitalize` stilleri Türkçe büyük harfi bozuyor ("SERAMIK", "Indirim").

## 3. hafta

Tamamlanan ([ADR 0007](adr/0007-oturum-ve-yetkilendirme.md)):
- Oturumlar: Argon2id parolalar, 15 dakikalık JWT erişim token'ı, tekrar kullanım tespitli dönen yenileme token'ı, çıkış
- Varsayılan kapalı API: her uç oturum ister, açık uçlar `@Public()`; kullanıcıya ait uçlarda sahiplik kontrolü; `@Roles()` hazır
- Kullanıcı uçları API'de: kayıt, giriş, profil, güncelleme, hesap silme (anonimleştirme); sipariş geçmişi (`GET /api/order/:userId`)
- Giriş, kayıt ve yenilemede IP başına rate limit (429)
- Sözleşme 25 uca çıktı (`auth/refresh`, `auth/logout`); kayıt artık oturum döndürüyor, parola en az 8 karakter
- Mobil: statik token kaldırıldı; tek API istemcisi ve RTK `baseQuery` kullanıcının token'ını taşıyor, 401'de tek seferlik yenileme yapıyor; token'lar Keychain/Keystore'da (`expo-secure-store`, iOS yeniden derlendi); çıkışta hesap verileri temizleniyor ve oturum sunucuda iptal ediliyor; "beni hatırla" çalışıyor; kayıt parolayı ekranlar arasında taşımıyor
- Mobil `tsc --noEmit`: 0 hata. CI'a mobil tip kontrolü işi eklendi
- Seed: demo hesap (`demo@everbloom.test` / `demo1234`) ve 2 örnek sipariş
- Testler: API birim 10, API e2e 49 (IDOR, süresi dolmuş/sahte token, rotasyon ve tekrar kullanım, hesap silme, rate limit), sözleşme ve mock 48

Kabul kriterleri:
- A kullanıcısının token'ı B'nin profiline ve siparişlerine erişemiyor: e2e testinde 4 uçta 403 ✔
- Süresi dolan token uygulamayı çıkışa düşürüyor: API 401 döndürüyor, uygulama yenilemeyi deniyor, o da 401 alırsa çıkış yapıyor ✔ (API testiyle; uygulamada 15 dakikalık bekleme simüle edilmedi)
- Mobil `tsc --noEmit` sıfır hata ✔

Simülatörde doğrulanan: API'ye giriş, yeniden açılışta Keychain'den oturumun dönmesi, profil ve sipariş geçmişinin API'den gelmesi, çıkışta `auth/logout` çağrısı.

Açık:
- OTP, şifre sıfırlama, yorumlar ve promosyon sorgulama hâlâ mock'ta (4. hafta). Uygulamada e-posta/telefon doğrulaması mock'ta yapılırsa API'deki kullanıcıyı güncellemez; demo hesabın ikisi de zaten doğrulanmış.
- CI ve staging durumu 2. haftadaki gibi.
