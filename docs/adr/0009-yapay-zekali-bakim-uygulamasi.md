# ADR 0009: Ürün yönü yapay zekâlı bitki bakımı; arka uçta ilk dilim

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026
- Kaynak: [reports/Yapay zekâlı bitki uygulaması MVP planı.md](../../reports/Yapay%20zekâl%C4%B1%20bitki%20uygulamas%C4%B1%20MVP%20plan%C4%B1.md)

## Karar

Ürün bitki mağazası değil, **bakım ve bilgi odaklı bir yapay zekâ bitki uygulaması**. Bitki ya da ürün satışı, satış bağlantısı ve reklam yok. Gelir yalnızca App Store / Google Play aboneliğinden geliyor.

Mağaza sürümü `v0-ticaret` etiketinde duruyor. 5. haftada yazılan sipariş ve ödeme kodu yerel `eticaret-hafta-5` dalında; `main`'e alınmadı.

## API'de ne kaldı, ne çıktı

- **Kaldı:** kimlik doğrulama, oturumlar, doğrulama kodları (Netgsm, SMTP), şifre sıfırlama, kullanıcı uçları ve eski katalog uçları. Katalog uçlarını eski Expo uygulaması kullanıyor; yeni uygulama gelince kaldırılacaklar.
- **Çıktı:** sipariş, ödeme, promosyon, yorum ve sözleşme onayı modülleri ve tabloları (migration `20261025170000_remove_commerce`).
  - Mock bu uçları API'ye yönlendirmiyor, kendisi yanıtlıyor; eski uygulama `pnpm mock:api` ile çalışmaya devam ediyor.
- **Hesap silme:** artık bitkileri, bakım kayıtlarını, taramaları ve fotoğraflarını, sohbetleri ve abonelik kaydını da siliyor. Anonimleştirilmiş satır, mağazalardan gelen faturalama olaylarının bağlanabilmesi için kalıyor.

## Yeni uçlar (`/api/v1`)

| Uç | Erişim | Açıklama |
|---|---|---|
| `GET /v1/species?q=`, `GET /v1/species/:id` | açık | Türkçe bakım kartları |
| `GET`/`POST /v1/my/plants`, `GET`/`PATCH`/`DELETE /v1/my/plants/:id` | oturum | Bitkilerim; başka kullanıcının bitkisi 404 |
| `POST /v1/my/plants/:id/care` | oturum | Bakım kaydı (sulama, gübre, saksı, budama, nem, not); geçmiş tarih olur, gelecek olmaz |
| `GET /v1/my/today` | oturum | Bugün sulanacaklar ve 3 gün içindekiler |
| `GET /v1/my/consents/ai`, `POST /v1/my/consents` | oturum | Yapay zekâ işleme onayı |
| `POST /v1/scans/identify`, `POST /v1/scans/diagnose` | oturum + onay + kota | Çok parçalı `image` (JPEG, PNG, WebP, HEIC; 8 MB) |
| `GET /v1/scans`, `GET /v1/scans/:id` | oturum | Tarama geçmişi |
| `GET`/`POST /v1/assistant/messages` | oturum + onay + kota | Bitkiyi bilen bakım asistanı |
| `GET /v1/me` | oturum | Profil, `publicId`, plan, limitler, kullanım, onay durumu |
| `POST /v1/billing/revenuecat` | paylaşılan sır | RevenueCat webhook'u |

Yeni uçlarda hata gövdesi `{message, code?}`. `code` değerleri:
- `consent_required`: uygulama onay ekranını gösterir.
- `quota_exceeded` (402): uygulama paywall'u gösterir.

## Tasarım kararları

- **Önce uzman API, sonra dil modeli.**
  - Tanıma ve teşhis `VisionProvider` arayüzünün arkasında; sürücüler `fake` ve `kindwise`. Plan, tanıma için Pl@ntNet'i de deniyor; seçim 1. haftadaki 50 fotoğraflık denemeyle yapılacak.
  - Kindwise sürücüsü resmî istemcinin (`flowerchecker/kindwise-api-client`) uç noktalarına ve gövdesine göre yazıldı, **canlı API ile denenmedi**.
- **Bakım kartları sunucuda ve Türkçe.**
  - İlk 24 tür taslak olarak seed'de; kartların hepsi `reviewed: false`, ziraat mühendisi kontrol edecek. Evcil hayvan toksisitesi ASPCA listelerine göre yazıldı, yeniden kontrol edilmeli.
  - Tanıma sonucu karta şu sırayla eşleniyor: bilimsel ad, eş anlamlılar, cins.
  - 0,5'in altındaki güvende uygulama ad vermiyor, daha iyi fotoğraf istiyor.
- **Teşhis ilaç önermiyor.** Sağlayıcının kimyasal tedavi önerileri sunucuda atılıyor; yalnızca biyolojik ve önleyici adımlar dönüyor. Her teşhiste ziraat mühendisi uyarısı ve 7 gün sonrası için takip tarihi var. Dayanak: bitki koruma ürünleri yönetmelikleri, 13 Aralık 2025, RG 33106.
- **Asistan.**
  - Kendi sağlayıcı arayüzünün arkasında; sürücüler `fake` ve `anthropic`. Resmî `@anthropic-ai/sdk` kullanılıyor, anahtar yalnızca sunucuda.
  - Kurallar sabit sistem isteminde: yalnızca bitki konuları, ilaç adı ve dozu yok, zehirlenmede veteriner ya da 114.
  - Bitkinin bakım kartı, son bakım kayıtları ve son teşhis ayrı bir sistem mesajıyla gidiyor; model yalnızca bunları açıklıyor.
  - Reddetmeye karşı sunucu tarafı yedek model (`fallbacks: "default"`) açık.
  - Varsayılan model `claude-opus-5-5`. Rapor ucuzluk için Haiku sınıfını öneriyor; `ASSISTANT_MODEL=claude-haiku-5-5` ile değişir. **Bu karar sahibin.**
- **Onay.** Fotoğraf ya da soru bir yapay zekâ sağlayıcısına gitmeden önce sürümlü, açık onay aranıyor (Apple 5.1.2(i), KVKK yurt dışı aktarım). Onay geçmişi eklemeli tutuluyor; metin sürümü değişince yeniden onay gerekiyor.
- **Kotalar sunucuda** ([kapsam.md](../kapsam.md) tablosu).
  - Başarısız sağlayıcı çağrıları ve yanıtlanmayan sorular kotadan düşmüyor.
  - Ücretsiz: haftada 3 tanıma, 1 deneme teşhisi, ayda 10 asistan mesajı, 5 bitki.
  - Premium: günde 50 tarama ve ayda 300 mesaj (adil kullanım).
- **Abonelik RevenueCat ile.** Webhook paylaşılan sırla doğrulanıyor (`Authorization: Bearer`).
  - Her olay olay kimliğiyle bir kez saklanıyor (`billing_events`), ne yapıldığıyla birlikte: uygulandı, eski, bilinmeyen kullanıcı ya da atlandı.
  - Sırası karışık gelen eski olaylar yok sayılıyor. Aktarım (TRANSFER) erişimi taşıyor. Sandbox olayları işaretleniyor.
  - Uygulama RevenueCat'e kullanıcıyı satır id'siyle değil, rastgele `publicId` UUID'siyle tanıtıyor.
- **Fotoğraflar kişisel veri.** Geliştirmede yerel klasörde (`UPLOAD_DIR`, git dışında) duruyorlar ve geri sunulmuyorlar. R2, imzalı yükleme ve EXIF silme planın 3. haftasında.
- **Üretimde sahte sürücü yasak.** `env.ts`, `VISION_DRIVER` ya da `ASSISTANT_DRIVER` `fake` ise veya `REVENUECAT_WEBHOOK_SECRET` yoksa uygulamayı açmıyor.

## Açık kalanlar

- Kindwise ve Pl@ntNet'in canlı denemesi; Türkçe ad oranı (plan: 1. hafta).
- Fotoğraf hattı: R2, EXIF silme, aynı fotoğrafın tekrarını önleme (3. hafta).
- Hatırlatıcılar ve günde tek toplu bildirim mobilde (4. hafta). Sunucu `GET /v1/my/today` ile hazır.
- Kotaların RevenueCat'ten uzaktan ayarlanması; şimdilik ortam değişkenleri.
- Her yapay zekâ sağlayıcısıyla KVKK standart sözleşmesi (sahibin dış işi; 6. haftada karar kapısı).
