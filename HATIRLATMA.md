# EverBloom: hatırlatma

Son kontrol: 3 Kasım 2026. Yeni bir oturuma buradan başla. Bir hafta ya da büyük bir iş bitince bu dosyayı da güncelle.

## Proje

Türkiye için yapay zekâlı bitki bakım uygulaması: fotoğrafla tanıma, Türkçe bakım kartları, teşhis ve iyileşme takibi, bitkiyi bilen asistan, sulama hatırlatıcıları. Ürün ya da bitki satışı, reklam ve satış bağlantısı yok; gelir yalnız aylık ve yıllık mağaza aboneliğinden geliyor.

| Klasör | İçerik | Nerede duruyor |
|---|---|---|
| `apps/api` | NestJS 12, Prisma 7.10, PostgreSQL; port 4100 | GitHub |
| `apps/admin` | Next.js 16 admin paneli; port 4200 | GitHub |
| `apps/app` | Yeni Expo 57 mobil uygulama | **Yalnız bu bilgisayarda**, ayrı bir yerel git deposu |
| `apps/mobile` | Eski Expo 50 mağaza uygulaması; kullanılmıyor | GitHub |
| `packages/contract` | Eski API sözleşmesi ve mock sunucu | GitHub |

Repo: <https://github.com/metinemredonmez/plant-app> (dal: `main`).

## Durum

| Konu | Durum |
|---|---|
| Ana repo | Son kod commit'i `3387c20` (8. hafta); GitHub ile aynı, CI yeşil |
| `apps/app` | `e0f9fa2`, bekleyen değişiklik yok; uzak deposu ve bilgisayar dışı yedeği yok |
| Testler (3 Kasım) | API birim 109, API e2e 114, uygulama Jest 80, admin 3; hepsi geçiyor, tip kontrolleri temiz |
| Çalışan servisler | Yalnız PostgreSQL; API, panel ve Metro kapalı |
| Açık PR'lar | 6 Dependabot PR'ı: 5'i kullanılmayan `apps/mobile` için, 6. PR API'deki `sharp` için (0.34.5 → 0.35.5). Hiçbiri birleştirilmedi |

Takvimde 2. haftadayız. Kod, 7. hafta hariç 8. haftaya kadar önde.

| Hafta | Konu | Durum |
|---|---|---|
| 1 | Ürün yönü, ticaret kodunun çıkarılması | Kod tamam; dış işler sahipte |
| 2 | Şablon temizliği, Expo 57 | Tamam; staging, Sentry ve EAS hesap bekliyor |
| 3 | Fotoğraf hattı, güven eşikleri, Türkçe adlar | Tamam; R2 hesabı ve sağlayıcı anahtarları bekliyor |
| 4 | Bitkilerim, takvim, hatırlatıcılar | Tamam; kapsam dondurma onayı sahipte |
| Ara istek | Açılış, giriş, kayıt, üyelik ([ADR 0012](docs/adr/0012-giris-kayit-ve-uyelik-akisi.md)) | Tamam; Apple, Google ve SMS hesap bekliyor |
| 5 | Teşhis güvenliği, iyileşme takibi ([ADR 0013](docs/adr/0013-teshis-guvenligi-ve-iyilesme-takibi.md)) | Tamam; Kindwise canlı denenmedi |
| 6 | Asistan, "Bildir", KVKK kapısı ([ADR 0014](docs/adr/0014-asistan-baglam-bildirme-ve-model-secimi.md)) | Tamam; model değerlendirmesi çalıştırılmadı |
| 7 | Abonelik, RevenueCat | **Bekliyor:** mağaza hesapları hazır değil, plan gereği 8 ile yer değiştirdi |
| 8 | Admin paneli ([ADR 0015](docs/adr/0015-admin-paneli.md)) | Tamam; rol atama ve barındırma sahipte |
| 9 | Hukuk ve KVKK akışları | **Sıradaki** |
| 10–16 | Hava uyarıları, sağlamlaştırma, beta, mağaza, lansman | Başlanmadı |

## Sıradaki iş: 9. hafta

Teslimatlar:
- Sürümlü metinler ve onay kayıtları; metin değişince yeniden onay.
- Fotoğrafların model geliştirmede kullanımı için ayrı, varsayılan olarak kapalı izin.
- KVKK başvuru formu ve süre takibi; saklama kuralları.
- Hesap silmenin sağlayıcılara yayılması; web silme sayfası; asistan hafızasını silme.

Kabul kriterleri:
- Metinler uygulamada ve web sitesinde yayında.
- Sürüm artınca sonraki açılışta yeniden onay isteniyor.
- Silme testi R2, Kindwise ve sohbet kayıtlarını temizliyor.
- Web formundan gelen talep işleniyor.
- Saklama işi zamanlanmış.

Avukat metinleri henüz yok. Altyapı taslak metinlerle kurulur; metinler gelince değiştirilir. Mağaza hesapları gelince 7. haftaya dönülür.

## Çalışma kuralları

- Plana göre, soru sormadan ilerle. Bir hafta bitince sonrakine geç; sahibin kararlarını belgelere yaz.
- Belgeleri güncel tut: `docs/ilerleme.md`, `docs/kapsam.md`, yeni ADR'ler, README'ler ve bu dosya.
- Commit edip yalnız bu reponun `main` dalına push et. Sonunda Türkçe, kısa bir rapor yaz.
- **`apps/app` asla yayımlanmaz:** şablon lisansı teyit edilmedi. `.git/info/exclude` ile ana repodan dışarıda.
- Dış hesap işi yapma (Railway, Neon, Sentry, EAS, RevenueCat, Apple, Google, Netgsm, Kindwise, Anthropic). Bunları sahibin işi olarak listele.
- `.env`, anahtar ve parolalar git'e girmez. Yapay zekâ anahtarları yalnız sunucuda durur, `EXPO_PUBLIC_` değişkenine asla. Belgelere yalnız ayar adları yazılır.
- `~/Desktop/fal-app` ve `~/Desktop/ai-beauty` salt okunur referans. Oralardaki `.env`, `private/`, anahtar ve sertifika dosyalarını okuma; fal-app'in açıklarını yayımlama.
- Prisma'nın yapay zekâ onay kapısını `migrate reset` için atlatma.
- Simülatördeki palemi uygulamasına dokunma. Simülatör ya da emülatör dışarıdan kapanırsa tekrar tekrar açma.
- "600+ Mobile Application" paketini kullanma.
- Varsayılan asistan modeli `claude-opus-5-5`. Haiku'ya geçiş sahibin kararı.
- **Kırmızı çizgi:** teşhis, asistan ve bakım kartlarında ürün adı, doz ve ilaçlama zamanı olamaz (`apps/api/src/safety/plant-protection.ts`).

## Çalıştırma

```bash
pnpm api:dev
```

```bash
pnpm --filter @everbloom/admin dev
```

```bash
cd apps/app && npx expo start --port 8081
```

- Test hesapları: müşteri `demo@everbloom.test` ([README](README.md)); yönetici `admin@everbloom.test` (`apps/api/prisma/seed-data.ts`). Yönetici hesabı üretimde açılmaz.
- Telefonla giriş geliştirmede `AUTH_PHONE_ENABLED=true` ve en az 32 karakterlik `PHONE_PEPPER` ister; kod API logunda görünür.
- Örnek fiyatlı üyelik ekranı için Metro `EXPO_PUBLIC_STORE_PREVIEW=1` ile başlatılır.
- Sahte sürücülerle tanıma, teşhis, asistan ve kart taslağı anahtarsız çalışır.

Testler:

```bash
pnpm --filter @everbloom/api test
```

```bash
pnpm --filter @everbloom/admin test
```

```bash
cd apps/app && npx jest
```

Gerçek modelle yapılacak ücretli denemeler (`ANTHROPIC_API_KEY` gerekir):

```bash
pnpm --filter @everbloom/api red-team
```

```bash
pnpm --filter @everbloom/api assistant:eval run claude-haiku-5-5 claude-sonnet-5-5 claude-opus-5-5
```

## Teknik tuzaklar

- **Migration:** `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` çıktısını yeni bir migration klasörüne yaz, başındaki "Loaded Prisma config" satırını sil, sonra `migrate deploy` ve `generate` çalıştır.
- **Next.js 16:** middleware'in adı `proxy.ts`. Kod yazmadan önce `apps/admin/node_modules/next/dist/docs` içindeki rehberi oku. React 19 action'dan sonra formu sıfırlar; reddedilen form gönderilen değerlerle geri dönmeli.
- **Claude Haiku 5.5:** `fallbacks` ve konuşma ortası sistem mesajı kabul etmiyor. Sürücü bunu hesaba katıyor (`modelFeatures`).
- **Zod 4:** `.partial()` `.default()` değerlerini korur; PATCH şemasında varsayılan kullanma, listeler silinir.
- **NativeWind:** `onPress` olan `Text` `className`'i kaybeder, `Pressable` kullan. Renk ezmek için `!` öneki gerekir (`!text-white`).
- **Jest:** `jest.mock` fabrikası dışarıdaki değişkenlere erişemez; gerçek modül için `jest.requireActual`.
- **iOS simülatörü (iPhone 16 Pro):** klavye Türkçe düzende, `@` ve `.` yanlış yazılır. Sistem anahtarına 0,2 saniyelik basış gerekir. Anlık dokunuşlar ekran geçişinden hemen sonra kaybolabilir.
- **`prebuild --clean` sonrası:** `apps/app/ios/.xcode.env.local` ve `apps/app/android/local.properties` yeniden oluşturulmalı. iOS'ta `pod install` için `LANG=en_US.UTF-8`.

## Doğrulanmayanlar

- Android arayüzü yeni akışla denenmedi; APK derleniyor.
- 5. ve 6. haftanın uygulama ekranları (teşhis sonucu, takip kartı, "Bildir") simülatörde görülmedi; Jest testleri kapsıyor.
- Kindwise ve Claude canlı çalıştırılmadı; bütün akışlar sahte sürücülerle denendi.
- Netgsm, Apple, Google ve e-posta sağlayıcısı gerçek hesapla denenmedi.

## Sahipte bekleyenler

Takvimin kritik yolu bunlar; planda 1. haftada başlaması gerekiyordu. Belgelerde başladıklarına dair kayıt yok.

- Limited şirket, D-U-N-S, kurumsal Apple ve Google hesapları.
- KVKK standart sözleşmeleri ve bildirimi: Kindwise, Anthropic, Cloudflare; ayrıca Railway, Neon, Sentry, RevenueCat ([liste](docs/kvkk-saglayicilar.md)).
- Avukat metinleri; aydınlatma ve koşullar şimdilik taslak.
- Ziraat mühendisi: 24 taslak kartın incelemesi ve model değerlendirmesi.

Karar bekleyenler:
- Kapsam dondurma onayı ([kapsam.md](docs/kapsam.md)).
- `apps/app` şablon lisansı ve uygulamanın yedeği.
- Asistan modeli: değerlendirmeden sonra.
- Ödeme duvarı modu: şimdilik ücretsiz çekirdek, sert duvar yok.
- Hava sağlayıcısı ve lisansı (Open-Meteo'nun ücretsiz ucu ticari kullanıma kapalı).
- Dependabot PR'ları.

Hesap ve anahtar bekleyenler:
- Anthropic anahtarı ve Kindwise kredisi.
- Netgsm hesabı, BTK başlığı ve OTP paketi.
- Sign in with Apple anahtarı; Google OAuth istemcileri.
- RevenueCat ve mağaza ürünleri.
- Railway, Neon, R2, Sentry, EAS.
- SMTP ve `ADMIN_ALERT_EMAIL`.
- Panel rolleri (`ADMIN`, `STAFF`) ve panelin barındırılması.

## Belgeler

- Plan: [reports/Yapay zekâlı bitki uygulaması MVP planı.md](reports/Yapay%20zekâlı%20bitki%20uygulaması%20MVP%20planı.md), "Hafta hafta plan" bölümü.
- Haftalık ayrıntı: [docs/ilerleme.md](docs/ilerleme.md).
- Kapsam: [docs/kapsam.md](docs/kapsam.md).
- Kararlar: [docs/adr](docs/adr) (yeni ürün için 0009–0015).
- KVKK sağlayıcıları: [docs/kvkk-saglayicilar.md](docs/kvkk-saglayicilar.md).
- API uçları ve ayarlar: [apps/api/README.md](apps/api/README.md). Panel: [apps/admin/README.md](apps/admin/README.md).
