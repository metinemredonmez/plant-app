# ADR 0007: Oturumlar, yetkilendirme ve mobil token saklama (3. hafta)

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026

## Bağlam

Şablonda gerçek bir kimlik doğrulaması yoktu. Bütün kurulumlar uygulama paketine gömülü aynı Bearer token'ı gönderiyordu ve kullanıcı yalnızca URL'deki id'den tanınıyordu. Bu token'ı bulan herkes başkasının profilini ve siparişlerini okuyabilir, hesabını silebilirdi (IDOR). Kayıt ekranı düz parolayı bir sonraki ekrana taşıyıp orada yeniden giriş yapıyordu. "Beni hatırla" hiçbir şey yapmıyordu, çıkış ise sepeti, favorileri ve kart bilgilerini cihazda bırakıyordu.

## Kararlar

**Sunucu** ([apps/api/src/auth](../../apps/api/src/auth))

- **Parola:** Argon2id (`@node-rs/argon2`), OWASP parametreleri: 19 MiB bellek, 2 tur, 1 iş parçacığı. Hesap yoksa da sahte bir özetle doğrulama yapılıyor; böylece yanıt süresinden hangi e-postaların kayıtlı olduğu anlaşılamıyor. Yanlış parola ile bilinmeyen e-posta aynı 401 mesajını alıyor.
- **Parola kuralı:** en az 8, en çok 128 karakter (NIST SP 800-63B). Mobil doğrulama da 8'e çıkarıldı.
- **Erişim token'ı:** 15 dakikalık JWT (`ACCESS_TOKEN_TTL_SECONDS`). İçinde yalnızca kullanıcı id'si ve rolü var.
- **Yenileme token'ı:** 32 baytlık rastgele değer, 30 gün geçerli (`REFRESH_TOKEN_TTL_DAYS`). Veritabanında yalnızca SHA-256 özeti tutuluyor.
- **Rotasyon:** her kullanımda yenileme token'ı yenisiyle değişiyor. Eski bir token tekrar gelirse bu çalıntı sayılıyor ve o oturum ailesinin tamamı iptal ediliyor. İki eşzamanlı yenileme isteğinden yalnızca biri kazanabiliyor; token atomik `updateMany` ile sahipleniliyor.
- **Varsayılan kapalı:** `JwtAuthGuard` genel guard. Katalog, sağlık, giriş, kayıt ve oturum uçları `@Public()` ile açıkça işaretli. Yeni bir uç yanlışlıkla korumasız kalamıyor.
- **Sahiplik:** `/api/user/:id`, `/api/user/update/:id`, `/api/user/delete/:id` ve `/api/order/:userId` uçlarında id, oturum sahibininkiyle aynı olmak zorunda; değilse 403 dönüyor. Eski yol yapısı korundu, frontend'e dokunmaya gerek kalmadı.
- **Roller:** `@Roles()` ve `RolesGuard` hazır. İlk kullanımları 8. haftadaki `/admin/*` uçları olacak.
- **Rate limit:** giriş, kayıt ve oturum yenileme uçlarında IP başına dakikada 10 istek (`AUTH_RATE_LIMIT`). Aşılırsa 429 ve Türkçe `{message}` dönüyor. Üretimde `trust proxy` açılıyor, böylece sınır proxy'ye değil gerçek istemciye uygulanıyor.
- **Hesap silme:** kişisel veriler siliniyor (ad, e-posta, telefon, adres, parola), bütün oturumlar ve OTP kayıtları kaldırılıyor. Satır, faturalı siparişler vergi mevzuatı gereği saklandığı için duruyor. E-posta adresi yeni bir hesap için serbest kalıyor. Bu, Apple 5.1.1(v) ve Google Play hesap silme kuralını karşılıyor.
- **Sözleşme değişiklikleri** (geriye dönük uyumlu): kayıt artık `{user, token, refreshToken}` döndürüyor. Yeni uçlar `POST /api/auth/refresh` ve `POST /api/auth/logout`. Sözleşmede artık 25 uç var.
- **Doğrulama:** istek gövdeleri zod ile doğrulanıyor (`ZodBody`), geçersiz gövdeye 422 `{message}` dönüyor. Rapor `class-validator` önermişti. Sözleşme paketi zaten zod kullandığı ve `nestjs-zod` NestJS 12'yi henüz desteklemediği için küçük bir pipe yazıldı. OpenAPI dokümanı (8. hafta) bu şemalardan üretilecek.
- **200 politikası:** eski POST uçları `@LegacyPost` ile 201 yerine 200 dönüyor.

**Mobil** ([apps/mobile/src/api/client.tsx](../../apps/mobile/src/api/client.tsx))

- Statik token kaldırıldı. Ekranlar tek bir axios istemcisi (`api`), RTK Query ise aynı token'ı okuyan bir `baseQuery` kullanıyor.
- 401 gelince istemci oturumu bir kez yeniliyor ve isteği tekrarlıyor. Aynı anda gelen 401'ler tek bir yenileme isteğini paylaşıyor; aksi halde sunucu bunu çalıntı sanıp oturumu düşürürdü. Oturum yalnızca yenileme de 401 alırsa sonlanıyor; ağ hatası oturumu düşürmüyor.
- Token'lar `expo-secure-store` ile iOS Keychain'de, Android'de Keystore'da duruyor. AsyncStorage'a yazılmıyor. Bu native bir modül olduğu için iOS projesi yeniden derlendi.
- `getUser` artık yalnızca 401, 403 ve 404'te çıkış yaptırıyor. Geçici bir 5xx ya da ağ hatası kullanıcıyı çıkışa düşürmüyor.
- Çıkış; kullanıcı, sepet, favoriler, ödeme bilgisi ve promosyon cüzdanını siliyor, API önbelleğini sıfırlıyor ve yenileme token'ını sunucuda iptal ediyor (`createListenerMiddleware`). Tanıtım ekranı bilgisi korunuyor.
- "Beni hatırla" işaretli değilse oturum uygulama kapanınca bitiyor (`PersistGate onBeforeLift`).
- Kayıt ekranı parolayı değil, API'den dönen oturumu taşıyor.
- Ayrıca düzeltilenler: `Home.tsx` tip hatası (`tsc` artık 0 hata), `SendPhoneOtp` içindeki `status = 200` ataması, ağ hatasında `catch` içinde çöken `error.response.status` erişimleri, kullanıcı nesnesini konsola yazan satırlar, var olmayan `rememberMeSlice` kaydı.
- Mobil pakete `"packageManager": "yarn@1.22.22"` eklendi. Bu olmadan corepack kökteki pnpm ayarını görüp `yarn` komutlarını reddediyordu.

## Doğrulama

- **API e2e (49 test):** IDOR (başka hesabın profil, güncelleme, silme ve sipariş uçları 403), token'sız ve eski statik token'la 401, süresi dolmuş ve başka anahtarla imzalanmış token 401, rotasyon, tekrar kullanımda ailenin iptali, çıkış, hesap silme ve e-postanın serbest kalması, rate limit (4. denemede 429), Argon2id saklama.
- **Simülatör:** API'ye giriş, uygulama yeniden açılınca Keychain'den oturumun dönmesi, profil ve sipariş geçmişinin API'den gelmesi, çıkışta sunucudaki oturumun iptali.

## Açık kalanlar

- Erişim token'ı hesap silindikten sonra en fazla 15 dakika geçerli kalıyor. Kullanıcı uçları silinmiş hesaba 404 döndüğü için bu bir veri sızıntısı değil.
- OTP, şifre sıfırlama (`resetToken`) ve sunucu tarafı promosyon doğrulaması 4. haftada. O zamana kadar bu uçlar mock'tan cevaplanıyor.
- Genel (her uç için) rate limit yok; şimdilik yalnızca kimlik doğrulama uçları sınırlı.
