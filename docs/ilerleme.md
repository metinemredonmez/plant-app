# İlerleme

Takvim: [reports/Bitki mağazası pazar ve MVP planı.md](../reports/Bitki%20mağazası%20pazar%20ve%20MVP%20planı.md), "Hafta hafta plan" bölümü. Bu dosya her haftanın sonunda güncellenir.

## Özet

| Hafta | Tarih | Durum |
|---|---|---|
| 1 | 26 Eki–1 Kas | Teknik işler tamam; dış işler sahipte |
| 2 | 2–8 Kas | Şema v1 ve katalog tamam; CI yazıldı ama çalıştırılmadı; staging ve Sentry hesap bekliyor |
| 3 | 9–15 Kas | Tamam: oturumlar, IDOR düzeltmesi, rate limit, mobil güvenli token; kabul kriterleri sağlandı |
| 4 | 16–22 Kas | Tamam: OTP, şifre sıfırlama, yorumlar, promosyon doğrulama, Türkçe uyarlama; kapsam donduruldu ([kapsam.md](kapsam.md)); Netgsm canlı hesapla doğrulanmadı |
| 5 | 23–29 Kas | Sırada: sipariş (sunucu tarafı fiyatlama, promosyon, stok), iyzico sandbox Checkout Form |

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

## 4. hafta

Tamamlanan ([ADR 0008](adr/0008-otp-yorum-promosyon.md)):
- Doğrulama kodları: e-posta ve SMS, 5 hane, yalnızca HMAC özeti saklanıyor, 10 dakika geçerli, 60 saniyede bir yeniden gönderim, 5 yanlış denemeden sonra kilit
- Şifre sıfırlama: doğrulanmış koddan tek kullanımlık `resetToken`; `change/password` token olmadan 401; şifre değişince bütün oturumlar kapanıyor
- Gönderim: Netgsm OTP (REST v2) ve sağlayıcıdan bağımsız SMTP sürücüleri; geliştirme ve testte `log` sürücüsü, üretimde yasak
- Yorumlar: yalnızca teslim almış müşteri, bitki başına tek yorum, maskeli ad, e-posta yok, puan yorumlardan hesaplanıyor
- Promosyon: süre, sahiplik ve kullanım limiti kontrolü; kişisel kodlar yalnızca sahibine görünüyor
- Mobil: ₺ fiyatlar, Türkçe harf kabul eden doğrulamalar, Türkçe büyük harf, sunucu hata mesajları, şifre sıfırlamada token zinciri, filtre ekranındaki şablon hatası
- Seed: 4 örnek müşteri, 12 yorum, kişisel ve limiti dolmuş promosyon kodları
- Güvenlik: `multer` 2.5.0'a çekildi (yüksek önem dereceli açık), kullanılmayan `@nestjs/mau` kaldırıldı; `pnpm audit` temiz
- Mock'ta yalnızca sipariş oluşturma kaldı; diğer 24 uç API'den geliyor
- Testler: API birim 29, API e2e 76, sözleşme ve mock 49; mobil `tsc` 0 hata
- İlk push: https://github.com/metinemredonmez/plant-app (public, sahibin kararıyla); CI `api` ve `mobile` işleri yeşil

Kabul kriterleri:
- 6. yanlış denemede kilitleniyor: e2e testinde 5 kez 401, 6. denemede doğru kodla bile 429 ✔
- Token'sız `change/password` 401 dönüyor ✔
- Süresi geçmiş kod indirim uygulamıyor: `YAZ15` listede yok ve `promocode/show` 404 dönüyor ✔
- Türk hattına SMS 3 dakika içinde ulaşıyor: **doğrulanmadı.** Netgsm hesabı ve OTP paketi gerekiyor; istemci topluluk kaynaklarından yazıldı ve resmi dokümanla karşılaştırılmalı

Simülatörde doğrulanan: şifremi unuttum → e-postaya kod (API logunda) → kod → yeni şifre → yeni şifreyle giriş; ₺ fiyatlar; API'den gelen yorumlar ve maskeli adlar; Türkçe karakter ve rakam içeren yorumun eklenmesi ve puanın güncellenmesi; Türkçe büyük harfli filtre çipleri.

Kapsam: 25 Ekim 2026'da donduruldu ([kapsam.md](kapsam.md)).

Sahipte bekleyenler: Netgsm hesabı, OTP paketi ve SMS başlığı; e-posta sağlayıcısı seçimi (SMTP bilgileri).
