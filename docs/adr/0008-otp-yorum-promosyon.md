# ADR 0008: Doğrulama kodları, şifre sıfırlama, yorumlar, promosyonlar ve Türkçe uyarlama (4. hafta)

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026

## Doğrulama kodları (OTP)

[apps/api/src/otp](../../apps/api/src/otp)

- **Kod:** 5 haneli, çünkü şablonun kod kutuları `^\d{5}$` bekliyor. `crypto.randomInt` ile üretiliyor.
- **Saklama:** veritabanında yalnızca HMAC-SHA256 özeti tutuluyor. Anahtar uygulama sırrı, girdi amaç + hedef + kod; düz kod hiçbir yerde saklanmıyor.
- **Ömür ve yeniden gönderme:** kod 10 dakika geçerli. Aynı hedefe yeni kod en erken 60 saniye sonra isteniyor (429), yeni kod eskisini geçersiz kılıyor.
- **Kilitleme:** 5 yanlış deneme hakkı var. 6. denemede kod kilitleniyor ve doğru kod girilse bile 429 dönüyor; kullanıcı yeni kod istemeli. Deneme sayacı atomik artıyor, bu yüzden paralel denemeler sınırı aşamıyor. Karşılaştırma `timingSafeEqual` ile yapılıyor.
- **Uçlar IP başına rate limit altında** (`AUTH_RATE_LIMIT`).
- **E-posta uçları iki işe yarıyor:** şablon iki akışta da aynı gövdeyi gönderiyor (`{email}`), ayırt etmenin tek yolu oturum. `@OptionalAuth()` ile:
  - **Oturum varsa:** hesabın kendi e-postası doğrulanır; başka bir adres 403.
  - **Oturum yoksa:** şifre sıfırlama. Adres kayıtlı olsun olmasın aynı yanıt dönüyor ("Kod gönderildi"), böylece uç hesap aramak için kullanılamıyor.
- **Telefon:** yalnızca Türkiye cep numarası kabul ediliyor (`+905XXXXXXXXX`; `05..`, `90..`, `5..` biçimleri normalleştiriliyor). Başka bir hesapta doğrulanmış numara 409.
- **İletim hatası:** sağlayıcı mesajı reddederse kod iptal ediliyor ve 502 dönüyor. Kullanıcı 60 saniye beklemeden yeniden deneyebiliyor.

## Şifre sıfırlama

- Şablonda `change/password` uç noktası yalnızca `{email, password}` alıyordu; e-postayı bilen herkes her hesabın şifresini değiştirebiliyordu. Artık oturumsuz e-posta doğrulaması `resetToken` döndürüyor ve `change/password` bu token olmadan 401 veriyor.
- `resetToken` 15 dakikalık bir JWT. `typ: reset` alanı taşıdığı için oturum token'ı yerine kullanılamıyor; erişim token'larına da bu yüzden `typ: access` eklendi.
- Token parolanın özetine bağlı: parola değişince geçersizleşiyor, yani tek kullanımlık.
- Şifre değişince hesabın bütün oturumları kapanıyor.
- Mobil: `VerifyEmailForgot` token'ı `NewPassword` ekranına taşıyor, o da `change/password` çağrısına ekliyor.

## Gönderim sağlayıcıları

[apps/api/src/messaging](../../apps/api/src/messaging)

- **SMS: Netgsm OTP rotası (REST v2).** Mesaj `POST /sms/rest/v2/otp` ile, Basic auth ve JSON (`msgheader`, `messages: [{msg, no}]`) olarak gidiyor; başarı kodu `00`.
  - Bu biçim Netgsm'in resmi dokümanından değil, topluluk istemcilerinden ([go-netgsm](https://pkg.go.dev/github.com/YusufDrymz/go-netgsm), [netgsm1/otp](https://github.com/netgsm1/otp)) çıkarıldı; resmi doküman (netgsm.com.tr/dokuman) okunamadı. **Canlıya almadan önce OTP paketi tanımlı bir Netgsm hesabıyla denenmeli.**
  - Kabul kriterindeki "Türk hattına SMS 3 dakikada ulaşıyor" maddesi bu yüzden doğrulanmadı.
- **E-posta: sağlayıcıdan bağımsız SMTP** (nodemailer 10, `SMTP_URL`). Sağlayıcı seçimi açık: SES, Brevo, Postmark ya da bir Türk sağlayıcı. Yurt dışı bir sağlayıcı KVKK yurt dışı aktarım bildirimi gerektirir (rapor, KVKK bölümü).
- **Geliştirme ve test:** `log` sürücüsü. Mesajlar gönderilmiyor; API loguna ve bellekteki bir kutuya (`Outbox`) yazılıyor. e2e testleri kodu buradan okuyor. `NODE_ENV=production` iken `log` sürücüsü ortam doğrulamasında reddediliyor, uygulama açılmıyor.
- **İYS:** mesaj metinleri ([messages.ts](../../apps/api/src/otp/messages.ts)) hiçbir tanıtım içermiyor. OTP ve işlem mesajları ancak böyle kaldığı sürece İYS kapsamı dışında (İYS yönetmeliği m.6).

## Yorumlar

- **Kim yazabilir:** yalnızca bitkiyi **teslim edilmiş** bir siparişte almış kullanıcı (403). Kargodaki bir sipariş yetmiyor.
- **Sınır:** bitki başına tek yorum (409). Puan 1–5, yorum 5–500 karakter.
- **Yazar bilgisi:** uygulamanın gönderdiği `name` ve `email` yok sayılıyor; yorumun sahibi oturumdaki kullanıcı.
- **Herkese açık liste:** e-posta yok, ad maskeli ("Ayşe Y."; soyadın baş harfi Türkçe kurala göre büyütülüyor), silinmiş hesaplar "Eski müşteri".
- **Sıralama:** liste eskiden yeniye dönüyor, çünkü Product ekranı listeyi ters çevirip en yeniyi üstte gösteriyor.
- **Puan:** yorum eklenince bitkinin `ratingAvg` ve `ratingCount` değerleri aynı transaction içinde yeniden hesaplanıyor.
- **Seed:** sabit puanlar kaldırıldı. Teslim edilmiş siparişleri olan 4 örnek müşteri 12 yorum yazıyor ve puanlar bunlardan türetiliyor.

## Promosyonlar

- `PromocodesService.findUsable` tek kontrol noktası. Kod aktif olmalı, süresi geçmemiş olmalı, kullanım limiti dolmamış olmalı ve sahibi yoksa ya da sahibi çağıranın kendisiyse kullanılabiliyor.
- Başka birine ait kod "bulunamadı" ile aynı yanıtı alıyor; süresi dolmuş ya da limiti dolmuş kod 404 ve gerekçeli mesaj alıyor.
- 5. haftada sipariş oluşturma aynı servisi kullanacak.
- `GET /api/promocodes` oturum varsa kullanıcının kişisel kodlarını da döndürüyor. Sepet ekranı kodu hâlâ bu listeye bakarak cihazda kontrol ediyor; sunucu tarafında indirim uygulanması 5. haftada. Süresi geçmiş kod listede hiç olmadığı için indirim de uygulanamıyor.

## Mobil: Türkçe uyarlama

- **Fiyatlar:** 6 dosyada 15 yerde `$` vardı; hepsi `utils.formatPrice` ile ₺ ve Türk biçimine çevrildi (₺1.590, ₺749,50). Intl'ye bağlı değil.
- **Doğrulama kuralları:** ad, kart sahibi ve ödeme ekranındaki ad kuralı artık Türkçe harfleri (ç, ğ, ı, İ, ö, ş, ü, â, î, û) kabul ediyor. Yorum kuralı rakam ve yaygın noktalama işaretlerini de kabul ediyor.
- **Büyük harf:** veriden gelen metinlerdeki `textTransform: 'uppercase'` yerine `utils.trUpper` kullanılıyor (SERAMİK, ÇİÇEKLİ). Veri zaten doğru yazıldığı için `capitalize` slayt başlıklarından, kategori ve kullanıcı adlarından kaldırıldı. Şablonun kendi İngilizce yazılarına dokunulmadı; arayüz metinlerinin Türkçeleştirilmesi Faz 2'de.
- **Hata mesajları:** OTP, yorum, promosyon ve şifre ekranları artık sunucunun Türkçe mesajını gösteriyor (`alert.serverError`): "60 saniye bekleyin", "kod kilitlendi", "bu kodun süresi dolmuş", "teslim almış olmalısınız".
- **Şablon hatası:** filtre ekranında bitki tipi çipleri seçili rengini saksı tipi seçimine bakarak alıyordu; düzeltildi.

## Bağımlılık güvenliği

- GitHub Dependabot `multer` (GHSA-q7qp-rjg7-q26m, yüksek) ve `undici` uyarıları üretti.
- `multer` `@nestjs/platform-express` 12.2.0 üzerinden 2.4.0 olarak geliyordu; kökteki `pnpm.overrides` ile 2.5.0'a çekildi.
- `undici` yalnızca kullanılmayan `@nestjs/mau` geliştirme aracından geliyordu; paket kaldırıldı.
- `pnpm audit`: bilinen açık yok (25 Ekim 2026).
