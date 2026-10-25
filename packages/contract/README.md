# @everbloom/contract

Expo uygulamasının (`apps/mobile`) bugün beklediği API sözleşmesi. Paket dört parçadan oluşuyor:

| Dosya | İçerik |
|---|---|
| [src/endpoints.ts](src/endpoints.ts) | Uçların makine tarafından okunabilir listesi (şablonun 23 ucu ve 3. haftada eklenen 2 oturum ucu: yöntem, yol, çağıran ekran, tepki verilen durum kodları) |
| [src/schemas.ts](src/schemas.ts) | Uygulamanın okuduğu yanıt ve gönderdiği istek gövdeleri için zod şemaları |
| [src/fixtures/](src/fixtures) | Türkçe örnek veri: 10 bitki, 5 kategori, renkler, saksı/bitki tipleri, slaytlar, banner, promosyon kodları, demo kullanıcı, siparişler, yorumlar |
| [mock/](mock) | Bu fikstürleri sunan, durumu bellekte tutan sıfır bağımlılıklı mock sunucu |

NestJS API'si (`apps/api`) 2. haftadan itibaren aynı şemalara karşı test edilecek. Böylece mock ile gerçek backend aynı sözleşmeden sapamaz.

## Mock sunucuyu çalıştırmak

```bash
pnpm mock
```

Varsayılan adres `http://localhost:4010`. iOS simülatörü bu adrese doğrudan ulaşır. Gerçek bir telefon için sunucunun açılışta yazdığı LAN adresini kullanın. Android emülatöründe adres `http://10.0.2.2:4010` olur.

| Ortam değişkeni | Varsayılan | Etki |
|---|---|---|
| `MOCK_PORT` | `4010` | Dinlenen port |
| `MOCK_DELAY_MS` | `0` | Her isteğe yapay gecikme ekler (yükleme ekranlarını görmek için) |
| `MOCK_UPSTREAM` | — | Gerçek API'nin adresi. Verilirse API'nin hazır uçları oraya yönlendirilir, kalanlar mock'ta kalır |
| `MOCK_UPSTREAM_ENDPOINTS` | API'nin hazır uçları | Yönlendirilecek uçların virgülle ayrılmış adları (`GET_PLANTS,GET_COLORS`). Varsayılan liste `mock/app.ts` içindeki `API_ENDPOINTS` |

### Upstream modu: uygulamayı uç uç backend'e taşımak

Uygulama giriş yapmadan ana sayfayı açmıyor ve her sekme değişiminde `GET /api/user/:id` çağırıyor. API'nin henüz bilmediği uçlar yüzünden doğrudan API'ye bağlanamıyor. Kökten `pnpm mock:api` çalıştırıldığında mock, API'nin hazır uçlarını (`http://localhost:4100`) yönlendiriyor ve geri kalanını kendisi cevaplıyor. Her istek günlükte `(api)` ya da `(mock)` olarak işaretleniyor. API'ye yeni bir uç eklendiğinde `API_ENDPOINTS` listesine de eklenmeli. Liste 25 ucun tamamını kapsayınca uygulama doğrudan API'ye bağlanabilir.

Test hesabı: `demo@everbloom.test`, parola `demo1234`. Mock'ta her OTP kodu `12345` ile doğrulanır. Kayıt, sipariş, yorum, profil ve hesap silme işlemleri bellekte tutulur, sunucu yeniden başlatılınca sıfırlanır.

Görseller fikstürlerde göreli yolla (`/images/monstera.jpg`) tutulur. Mock bunları isteğin `Host` başlığına göre mutlak adrese çevirir, bu yüzden simülatör ve LAN'daki cihaz aynı veriyle çalışır. Görseller şablonun onboarding fotoğraflarından kırpıldı (`apps/mobile/src/assets/images`). Gerçek ürün fotoğrafları 10. haftada gelecek.

## Uçlar

Yolların hepsi `${BASE_URL}api/...` altında. Başarı her zaman **200** döner, çünkü uygulama `response.status === 200` kontrolü yapıyor.

| # | Uç | Çağıran | İstek gövdesi | Başarılı yanıt | Hata durumları |
|---|---|---|---|---|---|
| 1 | `GET /api/user/:id` | `getUser`, her sekme değişiminde | — | Çıplak kullanıcı nesnesi | 401 oturum yenilenir; 403 başka hesap; 401/403/404 → uygulama çıkış yaptırır |
| 2 | `GET /api/order/:userId` | `getOrders` | — | `{orders: [...]}` (boşken de anahtar var) | 401, 403 başka hesap |
| 3 | `GET /api/reviews/:plantId` | `getReviews` | — | `{reviews: [...]}` | — |
| 4 | `GET /api/slides` | `getCarousel` | — | Çıplak dizi | — |
| 5 | `GET /api/promocodes` | `getPromocodes` | — | Çıplak dizi | — |
| 6 | `GET /api/colors` | `getColors` | — | Çıplak dizi | — |
| 7 | `GET /api/plants` | `getPlants` | — | Çıplak dizi | — |
| 8 | `GET /api/pot/types` | `getPotTypes` | — | Çıplak dizi | — |
| 9 | `GET /api/plant/types` | `getPlantTypes` | — | Çıplak dizi | — |
| 10 | `GET /api/banners` | `getBanners` | — | Çıplak dizi (yalnızca ilk eleman kullanılıyor) | — |
| 11 | `GET /api/categories` | `getCategories` | — | Çıplak dizi | — |
| 12 | `POST /api/user/login` | SignIn, SignUpAccountCreated | `{email, password}` | `{user, token, refreshToken}` | 401 |
| 13 | `POST /api/user/create` | SignUp | `{name, email, password}` | `{user, token, refreshToken}` (oturum; SignUpAccountCreated bunu başlatır) | 409 mükerrer e-posta, 422 parola < 8 |
| 14 | `POST /api/order/create` | Checkout | `{name, total, address, discount, delivery, subtotal, cardHolderName, products, userId, email, phoneNumber}` | `{order}` (uygulama okumuyor) | 200 dışı her şey → OrderFailed |
| 15 | `DELETE /api/user/delete/:id` | DeleteAccount | — | `{message}` | 401, 403 başka hesap |
| 16 | `POST /api/review/create` | LeaveAReview | `{comment, rating, name, plantId, email}` (API `name` ve `email`'i yok sayar) | `{review}` | 401, 403 teslim alınmamış, 409 ikinci yorum, 422 |
| 17 | `POST /api/promocode/show` | MyPromocodes | `{voucher}` | `{promocode}` | 404 bulunamadı, süresi dolmuş, limiti dolmuş (mesajda gerekçe) |
| 18 | `POST /api/change/password` | NewPassword | `{email, password, resetToken}` | `{message}`; bütün oturumlar kapanır | 401 token yok, geçersiz ya da kullanılmış |
| 19 | `PUT /api/user/update/:id` | EditProfile | `{name, location}` | `{user}` | 401, 403 başka hesap, 422 |
| 20 | `POST /api/send/otp/email` | SendEmailOtp(+Forgot), yeniden gönderim | `{email}` (yeniden gönderimde `otp` da geliyor) | `{message}` | — |
| 21 | `POST /api/send/otp/phone` | SendPhoneOtp, VerifyPhone | `{email, phoneNumber}` | `{message}` | — |
| 22 | `POST /api/verify/otp/phone` | VerifyPhone | `{email, phoneNumber, otp}` | `{user}` | 401 |
| 23 | `POST /api/verify/otp/email` | VerifyEmail(+Forgot) | `{email, otp}` | Oturumla `{user}` (e-posta doğrulandı); oturumsuz `{user, resetToken}` | 401 yanlış kod, 403, 422 süresi dolmuş, 429 kilitlendi |
| 24 | `POST /api/auth/refresh` | api istemcisi, 401 sonrası | `{refreshToken}` | `{token, refreshToken}` (yeni çift) | 401 oturum bitti |
| 25 | `POST /api/auth/logout` | Çıkış, hesap silme | `{refreshToken}` | `{message}` | — (her zaman 200) |

3. haftadan beri uygulama kullanıcının kendi oturumunu taşıyor: her istek `Authorization: Bearer <token>` ile gidiyor, 401 gelince istemci `auth/refresh` ile oturumu bir kez yeniliyor. `/api/user/:id` gibi kullanıcıya ait uçlarda id oturum sahibininkiyle aynı olmalı, değilse 403. `resetToken` alanı 4. haftadaki şifre sıfırlama düzeltmesi için şimdiden sözleşmede.

## Kırılgan kurallar

Bu kurallardan biri çiğnenirse uygulama hata vermeden boş ekran gösterir ya da çöker. Şemalar ve testler hepsini denetliyor.

1. **Liste uçları çıplak dizi döner.** `{data: [...]}` gibi bir sarmalayıcı, `transformResponse` tarafından sessizce `[]` yapılır.
2. **Başarı yalnızca 200'dür.** NestJS POST'larda varsayılan olarak 201 döndürür; eski uçlara `@HttpCode(200)` gerekiyor.
3. **`rating` bir sayıdır.** `ProductRating` ve `ReviewItem` `toFixed(1)` çağırıyor; string bir değer çalışma zamanında hata fırlatır.
4. **`oldPrice` yoksa alan hiç gönderilmez.** `ProductPrice` `{item.oldPrice && ...}` kullanıyor; `0` değeri `<Text>` dışında bir "0" bırakır ve uygulama çöker. Varsa fiyattan büyük olmalı.
5. **Sipariş satırının `id`'si bitki id'sidir.** Product ekranı "Yorum yaz" düğmesini buna bakarak açıyor; `OrderItem` tablosunun kendi id'si burada serileştirilmez.
6. **İlişkiler isimle taşınır.** `categories`, `colors`, `potTypes`, `plantTypes` isim dizileridir; uygulama `includes(name)` ile eşleştiriyor. Veritabanında normalize edilir, yanıtta isim dizisine çevrilir.
7. **`promotion` slayt ve banner ile birebir aynı metindir.** Promosyonu olmayan bitki `""` taşır. Her slayt ve banner promosyonunun en az bir bitkisi olmalı, yoksa uygulama "Products do not exist" uyarısı gösterir.
8. **Tarihler biçimlenmiş gelir.** `createdAt` ve `expires_at` ekrana olduğu gibi basılıyor, bu yüzden `GG.AA.YYYY` (Europe/Istanbul) biçiminde gönderilir.
9. **Kullanıcı nesnesi parola taşımaz.** Uygulama bu nesneyi AsyncStorage'a yazıyor.
10. **Yorumlar e-posta yayınlamaz.** Uygulama e-postayı göstermiyor; herkese açık listede olması KVKK açısından gereksiz risk.
11. **İstemcinin gönderdiği tutarlar yok sayılır.** Sipariş toplamı katalog fiyatlarından yeniden hesaplanır. Mock bunu şimdiden uyguluyor.

## Ek alanlar

Uygulama tanımadığı alanları yok saydığı için bitkiler, pazar araştırmasından gelen bakım alanlarını da taşıyor: `heightCm`, `light`, `watering`, `petSafe`, `careLevel`. Bunlar Bloomscape tarzı ışık/boy/evcil dostu filtreleri ve Türkçe bakım kartı için şemaya giriyor. Uygulamanın bunları göstermesi Faz 1 sonrasına kaldı.

## API'nin mock'tan farklı davrandığı yerler

- API stoğu 0 olan bitkileri listelemiyor; şablonda "tükendi" arayüzü yok.
- API yorumlarda adı maskeliyor ("Ayşe Y."), yalnızca teslim almış müşterinin yorum yazmasına izin veriyor ve puanı yorumlardan hesaplıyor.
- API doğrulama kodlarını gerçekten üretiyor; geliştirmede SMS ve e-posta gönderilmiyor, kod API logunda görünüyor.
- API `GET /api/promocodes` ucunda yalnızca süresi geçmemiş ve limiti dolmamış kodları döndürüyor: herkese açık olanlar ve oturum varsa kullanıcının kişisel kodları.
- API'nin verisi 41 bitkilik geliştirme kataloğu (`apps/api/prisma/seed-data.ts`). Mock ise 10 bitkilik küçük fikstürle çalışıyor. İkisi de aynı şemalara karşı test ediliyor.

## Bilinen sınırlamalar

- Mock oturumları imzasız: token yalnızca kullanıcı id'sini taşıyor (`mock-access-<id>`) ve mock `Authorization` başlığını denetlemiyor. Sahiplik ve süre kontrolleri yalnızca gerçek API'de; `pnpm mock:api` bu uçları zaten API'ye yönlendiriyor.
- Demo kullanıcının adı "Ayse Yilmaz" (Türkçe harfsiz) kaldı; 4. haftadan beri uygulama da API de Türkçe harfleri kabul ediyor.
- Mock doğrulama kodlarını kilitlemiyor ve 60 saniye kuralını uygulamıyor; bu kurallar yalnızca gerçek API'de (OTP her zaman `12345`).

## Testler

```bash
pnpm contract:test
```

`test/fixtures.test.ts` fikstürlerin şemalara, isim ilişkilerine ve görsel dosyalarına uyduğunu doğrular. `test/mock.test.ts` sunucuyu rastgele bir portta açar, 25 ucun hepsini uygulamanın gönderdiği gövdelerle çağırır ve hata durumlarını (401, 404, 409, 422) dener.
