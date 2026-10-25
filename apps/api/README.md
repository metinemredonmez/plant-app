# @everbloom/api

NestJS 12 + Prisma 7.10 REST API of the AI plant care app. Yeni uygulamanın uçları `/api/v1` altında: bakım kartları, Bitkilerim, bakım kayıtları, tanıma ve teşhis, yapay zekâ onayı, bakım asistanı, plan ve kota, RevenueCat webhook'u ([ADR 0009](../../docs/adr/0009-yapay-zekali-bakim-uygulamasi.md)). Eski Expo uygulamasının kimlik, kullanıcı ve katalog uçları (`/api/...`) yerinde duruyor; sipariş, yorum ve promosyon uçları mağazayla birlikte kaldırıldı. Diğer kararlar: [ADR 0002](../../docs/adr/0002-nestjs-12-ve-prisma-7.md), [0006](../../docs/adr/0006-sema-v1-ve-katalog.md), [0007](../../docs/adr/0007-oturum-ve-yetkilendirme.md), [0008](../../docs/adr/0008-otp-yorum-promosyon.md).

## Kurulum

```bash
cp .env.example .env            # USER ve JWT_SECRET'ı doldurun
createdb -h localhost everbloom_dev
createdb -h localhost everbloom_test
pnpm install                    # postinstall Prisma istemcisini üretir
pnpm db:migrate                 # prisma migrate dev
pnpm db:seed                    # bakım kartları, katalog, demo hesap ve bahçesi
pnpm start:dev                  # http://localhost:4100
```

Seed tekrar tekrar çalıştırılabilir. Kayıtları doğal anahtarlarıyla (bilimsel ad, isim, slug, e-posta) günceller, hiçbir şey silmez. Veriler [prisma/species-data.ts](prisma/species-data.ts) (24 Türkçe bakım kartı, uzman kontrolü bekliyor) ve [prisma/seed-data.ts](prisma/seed-data.ts) içinde. Demo hesap `demo@everbloom.test` / `demo1234`. E-postası ve telefonu doğrulanmış; bahçesinde üç bitki var, biri sulama günü geçmiş. Yapay zekâ onayı verilmemiş durumda, uygulama ilk taramada soruyor.

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
| `AUTH_RATE_LIMIT` | hayır | Giriş, kayıt, yenileme ve doğrulama kodu uçları için IP başına dakikalık sınır, varsayılan 10 |
| `SMS_DRIVER` | hayır | `log` (varsayılan; gönderilmez, logda görünür) ya da `netgsm`; üretimde `log` yasak |
| `NETGSM_USERCODE`, `NETGSM_PASSWORD`, `NETGSM_MSGHEADER` | `netgsm` ise | OTP paketi tanımlı Netgsm hesabı ve onaylı başlık |
| `EMAIL_DRIVER` | hayır | `log` (varsayılan) ya da `smtp`; üretimde `log` yasak |
| `SMTP_URL` | `smtp` ise | Örnek: `smtps://kullanici:parola@smtp.saglayici.com:465` |
| `EMAIL_FROM` | hayır | Gönderen adresi |
| `VISION_DRIVER` | hayır | `fake` (varsayılan; yeşil içeren her fotoğraf Monstera, yeşilsiz fotoğraf "bitki değil") ya da `kindwise`; üretimde `fake` yasak |
| `KINDWISE_API_KEY` | `kindwise` ise | plant.id / plant.health anahtarı |
| `ASSISTANT_DRIVER` | hayır | `fake` (varsayılan) ya da `anthropic`; üretimde `fake` yasak |
| `ANTHROPIC_API_KEY` | `anthropic` ise | Claude API anahtarı; yalnızca sunucuda |
| `ASSISTANT_MODEL` | hayır | Varsayılan `claude-opus-5-5`; daha ucuz seçenek `claude-haiku-5-5` |
| `WEATHER_DRIVER` | hayır | Asistan bağlamındaki şehir havası: `none` (varsayılan), `fake` ya da `open-meteo`; üretimde `fake` yasak. Sağlayıcıya yalnız şehir adı gider |
| `WEATHER_API_KEY` | hayır | Open-Meteo'nun ticari planı; yoksa ücretsiz, ticari olmayan uç kullanılır |
| `CARD_DRAFT_MODEL` | hayır | Admin panelindeki bakım kartı taslakları için model (varsayılan `claude-opus-5-5`); sürücü `ASSISTANT_DRIVER`'a uyar |
| `KINDWISE_USD_PER_CALL` | hayır | Maliyet tahmini için Kindwise çağrı fiyatı, varsayılan 0,055 dolar |
| `DAILY_SPEND_ALERT_USD` | hayır | Bugünkü tahmini yapay zekâ harcaması bunu geçince alarm e-postası, varsayılan 20 |
| `ADMIN_ALERT_EMAIL` | üretimde evet | Harcama alarmının gideceği adres(ler), virgülle |
| `SPEND_CHECK_MINUTES` | hayır | Alarmın kontrol aralığı, varsayılan 30; 0 kapatır |
| `KVKK_TRANSFER_APPROVED` | üretimde evet | Standart sözleşmesi imzalanıp KVKK'ya bildirilmiş yurt dışı sağlayıcılar, virgülle: `kindwise`, `anthropic`, `cloudflare`. Listede olmayan sağlayıcının sürücüsüyle üretim açılmaz ([liste](../../docs/kvkk-saglayicilar.md)) |
| `STORAGE_DRIVER` | hayır | Tarama fotoğrafları (kişisel veri): `local` (varsayılan) ya da `r2`; üretimde `local` yasak |
| `UPLOAD_DIR` | hayır | `local` için klasör, varsayılan `./uploads` (git dışında) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | `r2` ile evet | Gizli Cloudflare R2 kovası; herkese açık bağlantı yok |
| `FREE_IDENTIFY_PER_WEEK`, `FREE_DIAGNOSES`, `FREE_MESSAGES_PER_MONTH`, `FREE_PLANTS` | hayır | Ücretsiz plan: 3, 1, 10, 5 |
| `PREMIUM_SCANS_PER_DAY`, `PREMIUM_MESSAGES_PER_MONTH` | hayır | Premium adil kullanım: 50, 300 |
| `REVENUECAT_WEBHOOK_SECRET` | üretimde evet | RevenueCat'te webhook yetki başlığına `Bearer <sır>` olarak girilir |
| `AI_CONSENT_VERSION` | hayır | Yapay zekâ işleme onay metninin sürümü; değişince yeniden onay istenir |
| `AUTH_APPLE_ENABLED` | hayır | Apple ile giriş (varsayılan kapalı). Açıkken `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` ve `TOKEN_ENCRYPTION_KEY` zorunlu: hesap silmede Apple erişimi iptal edilir |
| `APPLE_BUNDLE_ID` | hayır | Apple kimlik jetonunun `aud` değeri, varsayılan `com.everbloom.care` |
| `AUTH_GOOGLE_ENABLED` | hayır | Google ile giriş; `GOOGLE_WEB_CLIENT_ID` ve `GOOGLE_IOS_CLIENT_ID` zorunlu (herkese açık değerler). Üretimde Apple da açık olmalı (App Store 4.8) |
| `AUTH_PHONE_ENABLED` | hayır | Telefonla giriş (yalnız +90). `PHONE_PEPPER` zorunlu; numara yalnız özet ve son iki hane olarak saklanır |
| `PHONE_CODES_PER_NUMBER_PER_DAY`, `PHONE_CODES_PER_DAY` | hayır | SMS tavanları: numara başına 24 saatte (5) ve günde toplam (1000) |
| `SMS_RETRIEVER_HASH` | hayır | Android SMS Retriever için uygulama özeti (11 karakter); SMS'in son satırına yazılır |
| `TOKEN_ENCRYPTION_KEY` | Apple ile evet | Apple yenileme jetonları için AES-256-GCM anahtarı (32 bayt, base64) |
| `MIN_APP_VERSION` | hayır | Bundan eski uygulamalar güncelleme ekranını görür (varsayılan `1.0.0`) |
| `PAYWALL_ONBOARDING` | hayır | Yeni hesaba bir kez üyelik ekranı (varsayılan açık) |
| `PORT` | hayır | Varsayılan 4100 |
| `NODE_ENV` | hayır | `development` ise loglar okunaklı tek satır; `production` ise `trust proxy` açık |
| `LOG_LEVEL` | hayır | Varsayılan `info` |

## Uçlar

Her uç varsayılan olarak oturum (`Authorization: Bearer <token>`) ister. Açık olanlar aşağıda "açık" diye işaretli.

| Uç | Erişim | Açıklama |
|---|---|---|
| `GET /health` | açık | Prisma üzerinden veritabanını yoklar; veritabanı yoksa 503 |
| `GET /api/plants`, `/categories`, `/colors`, `/pot/types`, `/plant/types`, `/slides`, `/banners` | açık | Katalog; çıplak diziler. Bitkiler yalnızca aktif ve stokta olanlar |
| `POST /api/user/create` | açık, rate limit | Kayıt → `{user, token, refreshToken}`; 409 kayıtlı e-posta, 422 geçersiz gövde |
| `POST /api/user/login` | açık, rate limit | Giriş → `{user, token, refreshToken}`; 401 |
| `POST /api/auth/refresh` | açık, rate limit | Yenileme token'ını yeni bir çiftle değiştirir; tekrar kullanılan token bütün oturumu iptal eder |
| `POST /api/auth/logout` | açık | Yenileme token'ını iptal eder, her zaman 200 |
| `GET /api/user/:id` | yalnızca kendi hesabı | Çıplak kullanıcı nesnesi; başka id 403, silinmiş hesap 404 |
| `PUT /api/user/update/:id` | yalnızca kendi hesabı | `{name, location}` → `{user}` |
| `DELETE /api/user/delete/:id` | yalnızca kendi hesabı | Kişisel verileri, bitkileri, taramaları ve fotoğrafları, sohbetleri siler; oturumları kapatır |
| `POST /api/send/otp/email` | isteğe bağlı oturum | Oturumla e-posta doğrulama kodu, oturumsuz şifre sıfırlama kodu (kayıtlı olmayan adrese de aynı yanıt) |
| `POST /api/verify/otp/email` | isteğe bağlı oturum | Oturumla `{user}`, oturumsuz `{user, resetToken}` |
| `POST /api/send/otp/phone`, `/verify/otp/phone` | oturum | Türkiye cep numarası; doğrulanınca numara hesaba yazılır |
| `POST /api/change/password` | açık, rate limit | `resetToken` zorunlu (yoksa 401); bütün oturumlar kapanır |

Eski uçlarda liste uçları çıplak JSON dizisi döndürür ve POST uçları 200 döner (`@LegacyPost`). Her hata `{message}` biçimindedir; yeni uçlar buna `code` ekleyebilir (`consent_required`, `quota_exceeded`).

### Yeni uygulamanın uçları (`/api/v1`)

Ayrıntı ve tasarım kararları [ADR 0009](../../docs/adr/0009-yapay-zekali-bakim-uygulamasi.md) içinde.

| Uç | Erişim | Açıklama |
|---|---|---|
| `GET /api/v1/species?q=`, `/api/v1/species/:id` | açık | Türkçe bakım kartları |
| `GET`, `POST /api/v1/my/plants`; `GET`, `PATCH`, `DELETE /api/v1/my/plants/:id` | oturum | Bitkilerim; ücretsiz planda 5 bitki |
| `POST /api/v1/my/plants/:id/care` | oturum | Bakım kaydı; sulama sonraki sulama gününü günceller |
| `GET /api/v1/my/today` | oturum | Sulanacaklar ve yaklaşanlar |
| `GET /api/v1/my/consents/ai`, `POST /api/v1/my/consents` | oturum | Yapay zekâ işleme onayı |
| `POST /api/v1/scans/identify`, `/api/v1/scans/diagnose` | oturum, onay, kota | Çok parçalı `image` (JPEG, PNG, WebP; 8 MB). Sunucu EXIF'i siler, 1280 piksele küçültür; aynı fotoğraf önceki sonucu döndürür. Tanımada `outcome`: `identified`, `possible` ya da `not_recognized`. Teşhiste ürün adı, doz ve uygulama zamanı süzülür, her sonuçta `referral` var ([ADR 0013](../../docs/adr/0013-teshis-guvenligi-ve-iyilesme-takibi.md)). Teşhiste `secondPhotoOf` (emin olunamayan sonuçtan sonra bir kez, 24 saat içinde) ya da `followUpOf` (en çok iki takip) alanı fotoğrafı ilk teşhise bağlar; bu fotoğraflar kotadan düşmez |
| `POST /api/v1/scans/:id/feedback` | oturum | `{correct}` teşhiste ("Bu teşhis doğru muydu?"), `{recovery: BETTER\|SAME\|WORSE}` takip fotoğrafında |
| `GET /api/v1/scans`, `/api/v1/scans/:id` | oturum | Tarama geçmişi; `parentId`, `link`, `correct`, `recovery` ile |
| `/api/v1/admin/*` | `ADMIN` ya da `STAFF` | Admin paneli ([ADR 0015](../../docs/adr/0015-admin-paneli.md)): `me`, `overview`; `species` (liste, ayrıntı, ekleme, `PATCH`, `:id/approve`, `drafts`); `reports` ve `reports/:id/resolve`. Yalnız `ADMIN`: `users`, `users/:id`, `users/:id/anonymize`, `costs`, `audit`. Müşteri token'ı 403 |
| `GET /api/v1/app-config` | açık | Açık giriş yolları, Google istemci kimlikleri, en düşük uygulama sürümü |
| `POST /api/v1/auth/apple`, `/api/v1/auth/google` | açık, hız sınırlı | Kimlik jetonuyla giriş ya da hesap açma; `isNew` döner |
| `POST /api/v1/auth/phone/code`, `/api/v1/auth/phone/verify` | açık, hız sınırlı | +90 numaraya 6 haneli SMS kodu; kodla giriş ya da hesap açma |
| `PUT /api/v1/me/care-profile`, `POST /api/v1/me/paywall-offered` | oturum | İlk soruların cevapları; tek seferlik üyelik ekranının gösterildiği |
| `GET`, `POST /api/v1/assistant/messages` | oturum, onay, kota | Bitkiyi bilen bakım asistanı: bitkinin yeri, son sulaması, son teşhisi ve takibi, kullanıcının şehri ve havası bağlama girer. Yanıttaki ürün adı, doz ve uygulama zamanı içeren cümleler çıkarılır; gerekirse uzman yönlendirmesi eklenir |
| `POST /api/v1/assistant/messages/:id/report` | oturum | "Bu yanıtı bildir": `{reason: WRONG\|UNSAFE\|OFF_TOPIC\|OTHER, note?}`; yalnız kendi asistan yanıtları |
| `GET /api/v1/me` | oturum | Profil, `publicId`, plan, limitler, kullanım |
| `POST /api/v1/billing/revenuecat` | paylaşılan sır | RevenueCat webhook'u |

## Uygulamayı API'ye bağlamak

Eski mağaza uygulaması kökten `pnpm mock:api` ile çalışır: kimlik, kullanıcı ve katalog uçları API'ye gider, sipariş, yorum ve promosyon uçlarını mock yanıtlar. Yeni uygulama doğrudan `http://localhost:4100/api/v1` adresine bağlanır.

## Testler

```bash
pnpm test        # birim testleri + e2e
pnpm test:e2e    # yalnızca e2e
pnpm red-team    # 50 istemlik kırmızı takım seti gerçek modele (ANTHROPIC_API_KEY gerekir, ücretli)
pnpm assistant:eval run      # 50 Türkçe soruyu aday modellere sorar, kör puanlama tablosu yazar (ücretli)
pnpm assistant:eval score <klasör>   # doldurulmuş tabloyu puanlar (eşik %85 doğru ve güvenli)
```

Kırmızı takım seti `test/fixtures/red-team.ts` dosyasında. e2e testi bu istemleri kasıtlı olarak kurala aykırı yanıt veren bir modelle çalıştırır ve kullanıcıya hiçbir ürün adı, doz ya da uygulama zamanının ulaşmadığını doğrular. `pnpm red-team` aynı istemleri yapılandırılmış modele gönderir ve her istem için ham yanıtın neyi ihlal ettiğini, süzgeçten sonra neyin kaldığını yazar.

e2e testleri `DATABASE_URL`'deki veritabanının `_test` sonekli kopyasını kullanır (`everbloom_dev` → `everbloom_test`). Başka bir adres için `TEST_DATABASE_URL` verin. Kurulum yalnızca bekleyen migration'ları uygular ve seed'i çalıştırır, hiçbir veriyi silmez. Testler her çalıştırmada benzersiz e-postalarla yeni test hesapları açar. Sözleşme snapshot'ları `test/__snapshots__` altında; bilinçli bir sözleşme değişikliğinden sonra `pnpm test:e2e -u` ile güncellenir.

## Notlar

- Prisma sürümleri tam sabit (`7.10.1`). CLI'ın "8.0.0-rc güncellemesi var" uyarısını dikkate almayın.
- Prisma yapılandırması `prisma7.config.ts` içinde. Prisma 7 `.env`'i kendisi yüklemiyor, dosya bunu `dotenv` ile yapıyor.
- Üretilen istemci `src/generated/prisma` altında ve git'e girmiyor.
- Prisma 7.10, `migrate reset` komutunu yapay zekâ ajanlarından gelince kullanıcı onayı olmadan çalıştırmıyor. Test kurulumu bu yüzden veri silmeyen `migrate deploy` kullanıyor.
