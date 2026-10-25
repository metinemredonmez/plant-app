# ADR 0012: Açılış, giriş, kayıt ve üyelik akışı

- Durum: Kabul edildi (sahibin isteği, 25 Ekim 2026)
- Tarih: 25 Ekim 2026
- Kaynaklar:
  - fal-app'in akışı (`apps/mobile/components/AnimatedSplash.tsx`, `app/(onboarding)`, `app/(auth)`, `app/paywall.tsx`, `src/lib/kokRota.ts`, `src/lib/onboardingGate.ts`, `src/services/socialAuth.ts`, `apps/backend/src/modules/auth/apple-siwa.service.ts`). Yalnız okundu, kopyalanmadı; düzen ve mantık bu uygulamaya taşındı.
  - Giriş ve üyelik akışı önerisi (palemi, 25 Ekim 2026): kurallar ve mağaza/KVKK notları.

## Akış

İlk kurulum:

1. **Açılış animasyonu** (~2,8 sn). Sistem açılış ekranıyla aynı zemin (#F3F7F3), hafif sedef ve pembe ışık.
   - Filiz logosu görünmez bir el çiziyormuş gibi belirir (`strokeDashoffset`), sonra dolar. Dolarken yaprakların üstünde inci gibi bir parlama gezinir.
   - Çevresinde altı küçük dört köşeli ışıltı sırayla yanıp söner; arkada bir hale nefes alır.
   - "EverBloom" ince serif harflerle (Cormorant Garamond 300) aşağıdan gelir, üstünden altın bir parıltı geçer. Ardından harf aralıklı slogan gelir.
   - Son: 1,06'ya büyüme ve solma.
   - Koyu temada koyu zemin ve şampanya rengi ışıltı. "Hareketi azalt" açıksa yalnız sakin bir solma var.
2. **Karşılama**: tam ekran yaprak görseli (logodan türetilmiş, fotoğraf lisansı gerekmiyor), tek cümlelik değer, "Başla" ve "Zaten hesabım var · Giriş yap".
3. **Beş soru**, her biri tek ekran, büyük seçim kartlarıyla ve "Geç" ile: deneyim, bitkilerin yeri, ihtiyaç, evcil hayvan, şehir.
   - Cevaplar hesap açılana kadar yalnız bellekte durur (`lib/onboarding.ts`; SecureStore ya da AsyncStorage yok).
   - Hesap açılınca `PUT /v1/me/care-profile` ile sunucuya gider.
   - Asistan, evcil hayvan ve deneyim bilgisini bağlamında kullanıyor.
4. **Gizlilik**: KVKK aydınlatma metni bir bağlantıdır, onay kutusuna bağlanmaz. Yurt dışına aktarım için açık rıza ayrı bir anahtardır: isteğe bağlı ve kapalı başlar. Zorunlu bir onay yok.
5. **İlk hediye**: plan yalnız ön seçilir (yıllık seçili, aylık). Fiyat mağazadan gelir; deneme yalnız mağaza sunuyorsa yazılır. Ödeme yok.
6. **Hesap**:
   - iOS'ta Apple ile devam et, Apple'ın sistem düğmesiyle.
   - Google ile devam et, resmî dört renkli G ile.
   - Telefonla devam et.
   - E-postayla devam et.
7. **Üyelik ekranı (onboarding modu)**:
   - Ön seçili plan; sağ üstte görünür "Şimdi değil".
   - Altta "Şimdilik ücretsiz devam et" ve "Plan seçmezsen ücret alınmaz."
   - İlk ücretin tutarı ve tarihi düğmenin üstünde; geri yükle, koşullar ve gizlilik bağlantıları.
   - Mağaza 4 saniyede plan vermezse ekran atlanır ve "gösterildi" yazılmaz (sonraki açılışta yeniden denenir).
8. **İzin ön ekranları** özellik kullanılırken açılır (bildirim ilk bitkiden sonra, kamera ilk çekimde). Tek düğme var, "Devam" (Apple HIG). Reddeden durdurulmaz: liste ve galeri çalışmaya devam eder.

Dönen kullanıcı:

- **Cihaz damgası** (`lib/device-stamp.ts`): yalnız "bu cihazda hesap vardı" ve son giriş yolu tutulur (`apple`, `google`, `phone`, `email`). Numara ya da e-posta tutulmaz. Çıkışta silinmez, hesap silinince silinir.
- Damga varsa açılışta "Tekrar hoş geldin" ekranı gelir. Son kullanılan yol en üstte, "Son kullandığın" etiketiyle; altta "Yeni misin? · Hesap aç".
- Girişte ödeme ekranı gösterilmez. Var olan hesaplar göçte "gösterildi" sayıldı. Eksik adım varsa sunucu söyler ve o adım açılır.

## Kök yönlendirme

`lib/root-route.ts` saf bir fonksiyondur ve tablo testleriyle kilitlidir (`test/root-route.test.ts`, 22 durum). Sıra:

1. Zorunlu güncelleme → güncelleme ekranı.
2. Oturum yok, damga yok → karşılama.
3. Oturum yok, damga var → giriş.
4. Oturum var, eksik adım var → o adım (`profile`: sorular `?resume=1`; `paywall`: tek seferlik üyelik ekranı).
5. Yoksa ana sayfa.

Frenler:

- `flowRunning`: giriş akışı sürerken yönlendirme susar.
- `triedStep`: bu oturumda tamamlanıp sunucuda hâlâ eksik görünen adım yeniden açılmaz.
- Tanınmayan adım adları yok sayılır; yeni bir sunucu adımı eski sürümde kimseyi kilitlemez.

## Sunucu

- **Apple ve Google**: `POST /v1/auth/apple`, `/v1/auth/google`.
  - Kimlik jetonu sağlayıcının yayımladığı anahtarlarla (JWKS) doğrulanır: imza, `iss`, `aud`, süre.
  - Apple'da ayrıca nonce kontrol edilir: uygulama Apple'a SHA-256 özetini, sunucuya ham değeri verir.
  - Hesap bağlama yalnız sağlayıcının doğruladığı e-postayla yapılır; doğrulanmamış adres var olan hesabı ele geçiremez.
  - Ücretsiz Google kitaplığı nonce desteklemiyor; Google'da nonce yok.
- **Apple erişim iptali**: girişteki `authorizationCode`, Apple'da refresh token'a çevrilir ve AES-256-GCM ile şifreli saklanır. Hesap silinirken `/auth/revoke` çağrılır. Apple yanıt vermezse kayıt kuyruğa alınır ve geri çekilmeli aralıklarla yeniden denenir (en çok 12 kez); silme beklemez.
  - Açma koşulu: `AUTH_APPLE_ENABLED`, anahtar ve şifreleme anahtarı olmadan açılmaz.
- **Telefon**: `POST /v1/auth/phone/code`, `/v1/auth/phone/verify`.
  - Yalnız +90 cep numaraları.
  - 6 haneli kod, 5 dakika geçerli, 60 saniye yeniden gönderme beklemesi, 5 yanlış denemede kilit.
  - Numara başına 24 saatte 5 kod ve günde toplam 1000 kod tavanı.
  - Veritabanında yalnız biberli HMAC özeti ve son 2 hane tutulur. Numara loga ve yanıta yazılmaz.
  - SMS metni tanıtım içermez (İYS dışı); son satırda Android SMS Retriever özeti var. SMS okuma izni istenmez.
- **`GET /v1/app-config`**: açık yollar, Google istemci kimlikleri (herkese açık değerler), en düşük uygulama sürümü.
- **`GET /v1/me` eklentileri**: `signInMethod`, `phoneHint`, `careProfile`, `missingSteps`. E-postası olmayan hesapta `email` alanı `null` döner.
- **Varsayılan davranış değişmez**: üç yeni yol da kapalı başlar. Yapılandırma adları [apps/api/README.md](../../apps/api/README.md) dosyasında; değerler yalnız sunucu `.env`'inde.

## Kurallar

- **Apple 4.8**: Google varsa Apple da sunulur. Uygulamada iOS'ta Apple yoksa Google gizlenir; üretimde sunucu yalnız Google'ı açınca başlamaz.
- **HIG**: Apple düğmesi sistem düğmesidir, diğerleriyle aynı yükseklikte (54) ve kaydırmadan görünür.
- **3.1.2**: fiyat ve deneme mağazadan gelir; ilk ücretin tutarı ve tarihi düğmenin üstünde; yenileme metni, geri yükleme, koşullar ve gizlilik ekranda.
- **5.1.1**: hesap silme uygulama içinde; Apple erişimi de iptal edilir.
- **Google**: marka kuralı (resmî G, "Google ile devam et"). Data safety için gereksiz Android izinleri kaldırıldı: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, depolama.
- **KVKK**: aydınlatma ile rıza ayrı; SMS'te tanıtım yok; telefon numarası özetlenerek saklanıyor.

## fal-app'ten farklar

- Apple düğmesi elle çizilmedi, sistem düğmesi kullanıldı. Nonce eklendi.
- KVKK aydınlatması zorunlu bir onay kutusuna bağlanmadı.
- Bildirim ön ekranında iki düğme yerine tek "Devam" var.
- Apple jetonu fal-app'teki gibi düz metin değil, şifreli saklanıyor; başarısız iptal yeniden deneniyor.
- Ödeme ekranı her yeni hesapta bir kez çıkıyor. fal-app'te giriş ekranından Apple ya da Google ile gelen yeni kişi bu ekranı hiç görmüyordu.
- Yüzle giriş, şifre sıfırlama dışı e-posta akışları, jeton ekonomisi ve açılış müziği alınmadı.

## Açık kalanlar (sahibin kararı ya da hesabı)

- **SMS sağlayıcısı**: Netgsm sürücüsü hazır; hesap, BTK başlığı ve OTP paketi gerekiyor. Telefonla giriş ancak bunlarla açılabilir.
- **Ödeme duvarı modu**: şimdilik ücretsiz çekirdek ve "Şimdilik ücretsiz devam et" var (sert duvar yok). Sert duvar, mağaza metinlerini ve kuralları değiştirir.
- **Apple Developer**: Sign in with Apple yeteneği, .p8 anahtarı, gizli e-posta aktarımı için gönderen kaydı.
- **Google Cloud**: OAuth istemcileri (web, iOS, Android SHA-1). iOS URL şeması derlemede `GOOGLE_IOS_URL_SCHEME` ile verilir.
- **Mağaza ve RevenueCat (7. hafta)**: fiyatlar ve deneme gelene kadar onboarding üyelik ekranı atlanıyor. RevenueCat `appUserID` hesabın `publicId`'si olacak.
- **Hukuk**: aydınlatma ve koşul metinleri taslak; avukat metni gelince değişecek. Telefonun işlenme dayanağı ve İYS dışında kalma teyit edilmeli.
