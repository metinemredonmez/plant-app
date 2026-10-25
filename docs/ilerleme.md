# İlerleme

**25 Ekim 2026'dan itibaren ürün yapay zekâlı bitki bakım uygulaması.** Bitki mağazası olarak geçen 1–4. haftalar aşağıda kayıtlı; o sürüm `v0-ticaret` etiketinde. Yeni takvim: [reports/Yapay zekâlı bitki uygulaması MVP planı.md](../reports/Yapay%20zekâl%C4%B1%20bitki%20uygulamas%C4%B1%20MVP%20plan%C4%B1.md), "Hafta hafta plan" bölümü. Kapsam: [kapsam.md](kapsam.md). Karar: [ADR 0009](adr/0009-yapay-zekali-bakim-uygulamasi.md).

## Yeni plan

| Hafta | Tarih | Durum |
|---|---|---|
| 1 | 26 Eki–1 Kas | Teknik işler başladı (aşağıda); dış işler sahipte |
| 2 | 2–8 Kas | Öne çekildi: şablon temizliği, Expo 57, iOS ve Android derlemesi tamam; staging, Sentry ve EAS hesap bekliyor |
| 3 | 9–15 Kas | Öne çekildi: fotoğraf temizleme, tekrar önleme, güven eşikleri, R2 sürücüsü ve Wikidata adları tamam; R2 hesabı ve sağlayıcı anahtarları bekliyor |
| 4 | 16–22 Kas | Öne çekildi: yerleşim, mevsimlik sulama, 14 günlük takvim, günde tek hatırlatıcı, elle ekleme tamam; kapsam dondurma sahibin onayında |

### 1. hafta (yeni plan)

Tamamlanan:
- Ticaret sürümü etiketlendi (`v0-ticaret`). API'den sipariş, ödeme, promosyon, yorum ve sözleşme onayı çıkarıldı; kaldırılan uçlar 404 dönüyor.
- Öne çekilen işler (3–7. haftalar):
  - Şema v2: tür kartları, Bitkilerim, bakım kayıtları, taramalar, asistan mesajları, abonelik hakkı ve faturalama olayları
  - 24 türlük Türkçe bakım kartı taslağı
  - Tanıma ve teşhis uçları (sahte ve Kindwise sürücüleri)
  - Yapay zekâ işleme onayı
  - Ücretsiz/premium kotaları
  - Bitkiyi bilen bakım asistanı (sahte ve Claude sürücüleri)
  - RevenueCat webhook'u
  - Hesap silmenin yeni verileri kapsaması
  - Demo hesap için 3 bitkilik bahçe
- Testler: API birim 24, API e2e 75 (13'ü yeni bakım, tarama, asistan, abonelik ve silme testi), sözleşme ve mock 49.

- Yeni mobil uygulama (planın 2. haftası öne çekildi):
  - Picaso şablonu (Expo 54, NativeWind, expo-router) temel alındı; EverBloom paleti kullanılıyor; arayüz Türkçe.
  - Giriş ve kayıt API'ye bağlı. Token'lar Keychain'de, oturum yenileme tek seferlik.
  - Sekmeler: Bitkilerim (bugün su bekleyenler, "Suladım"), Ansiklopedi (bakım kartları), tarama, Asistan, Profil (plan, kullanım, yapay zekâ onayı, çıkış, hesap silme).
  - Ekranlar: tanıma ve teşhis (fotoğraf 1024 piksele küçültülüyor, EXIF düşüyor), yapay zekâ onayı, bitki detayı ve bakım günlüğü, bitkiye özel asistan, paywall (satın alma 7. haftada RevenueCat ile).
  - Şablon lisansı teyit edilene kadar kod `apps/app` altında, yalnızca yerel bir git deposunda; herkese açık repoya girmiyor.

Simülatörde doğrulanan (sahte sürücülerle):
- Demo hesapla giriş; bahçedeki üç bitki ve geciken sulama.
- "Suladım" ile sonraki sulama tarihinin güncellenmesi.
- Galeriden Monstera fotoğrafıyla tanıma (%94, Türkçe bakım kartı) ve bitkiyi ekleme. Ekim olduğu için kış aralığı (14 gün) seçildi.
- Bitkiye özel asistan; sunucu bitki bilgisini ekliyor.
- Teşhis: kimyasal içermeyen adımlar, ziraat mühendisi uyarısı, 7 gün sonrası için hatırlatma.
- İkinci teşhiste 402, paywall uyarısı ve paywall ekranı.

Bulunan ve düzeltilen: NativeWind ile denetimli `TextInput` yeni mimaride hızlı yazımda karakter kaçırıyordu; alanlar denetimsiz yapıldı.

Doğrulanmayan:
- Kamera (simülatörde yok).
- Onay ekranı: demo hesaba duman testinde onay verilmişti, ekran açılmadı.
- Profil sekmesi, yeni hesapla kayıt, hatırlatma bildiriminin gelmesi.
- Android derlemesi.

Şablondan kalan, kullanılmayan üç bileşen (`Calendar`, `ConfirmationModal`, `forms/Slider`) `tsc` hatası veriyordu. 2. haftada silindi.

Bekleyen (1. hafta):
- Sahibin dış işleri: limited şirket, D-U-N-S, kurumsal mağaza hesapları, KVKK standart sözleşme talepleri, avukat, ziraat mühendisi.
- Pl@ntNet ve Kindwise'ın 50 fotoğraflık Türkiye denemesi (anahtar ve deneme kredisi gerekiyor).
- Şablonların SDK 54'te yeni mimariyle derlenmesi; hava sağlayıcısı adayları.
- Node 22'ye geçiş.

### 2. hafta (yeni plan)

Tamamlanan:
- Şablon temizliği:
  - Kullanılmayan ekranlar, bileşenler ve paketler silindi.
  - `(drawer)` grubu `(app)` oldu.
  - Şablonun ikon ve açılış görselleri EverBloom'unkilerle değişti.
  - Uygulama adı EverBloom, paket kimliği `com.everbloom.care`.
- Expo SDK 54 → 55 → 56 → 57. Her adımda `npx expo install --fix`, `expo-doctor` ve derleme yapıldı.
  - Sonuç: React Native 0.86, React 19.2, expo-router 57, Reanimated 4.5, NativeWind 4.2.
  - `expo-doctor` 21/21, `tsc --noEmit` 0 hata. Bağımlılıklarda expo-av yok.
- Prebuild ile `ios/` ve `android/` üretildi (git dışında). iOS en düşük sürüm 16.4, Android targetSdk 36.
- Debug derlemeleri: iOS simülatör (iPhone 16 Pro) ve Android emülatör (Pixel 8a, arm64).

Android emülatörde doğrulanan (sahte sürücülerle):
- Demo hesapla giriş; kayıt ve "Şifremi unuttum" bağlantıları.
- Bitkilerim, bitki detayı ve bakım kartı, Ansiklopedi.
- Asistan; galeriden tanıma (Monstera, %94).
- Profil (plan, kullanım, yapay zekâ onayı) ve çıkış.

iOS simülatörde doğrulanan (SDK 57): oturumun Keychain'den dönmesi, Bitkilerim, galeriden fotoğraf yükleme, haftalık tanıma sınırında 402 ve paywall.

Bulunan ve düzeltilen:
- SDK 57'de global `fetch` Expo'nun kendi uygulaması ve React Native'in `{ uri, name, type }` FormData parçasını reddediyor ("Unsupported FormDataPart implementation"). Fotoğraf artık `expo-file-system` `File` nesnesi olarak gidiyor.
- NativeWind, `onPress` verilen `Text`'in `className`'ini uygulamıyor; giriş ekranındaki bağlantılar Android'de stilsizdi. Bağlantılar `Pressable` içine alındı.
- `ThemedText`'in varsayılan `text-text` rengi diğer renk sınıflarını eziyor; renk sınıfları `!` ile yazılmalı (`!text-highlight`).
- Kök düzen fontlar yüklenirken boş döndüğü için expo-router "mount olmamış bileşende state güncellemesi" hatası veriyordu. Açılış ekranı fontlar gelene kadar açık kalıyor, navigator hemen kuruluyor.
- `legacy-peer-deps` ayarı zorunlu eşleri (`react-refresh`) atlıyordu ve Android paketi oluşmuyordu. `.npmrc` kaldırıldı, `react-dom` `expo install` ile sabitlendi.
- Geliştirme notu: `CI=1 npx expo start` dosya izlemeyi kapatıyor, değişiklikler uygulamaya gelmiyor.

Doğrulanmayan:
- Fiziksel iPhone ve Android cihaz; EAS dev build (EAS hesabı gerekiyor). "Bir iPhone'da ve bir Android cihazda açılıyor" kriteri bu yüzden yalnızca simülatör ve emülatörde sağlandı.
- Kamera, hatırlatma bildiriminin gelmesi, yeni hesapla kayıt; teşhis akışı SDK 57'de tekrar denenmedi.

Bekleyen (2. hafta, sahipte): Railway + Neon staging, Sentry ve EAS hesapları. Staging `/health` ve staging'de giriş, yenileme ve çıkış bunlara bağlı.

### 3. hafta (yeni plan)

Tamamlanan ([ADR 0010](adr/0010-fotograf-hatti-ve-turkce-adlar.md)):
- Fotoğraf sunucuda temizleniyor: yön piksellere uygulanıyor, en uzun kenar en fazla 1280 piksel, EXIF ve GPS'siz JPEG. HEIC artık kabul edilmiyor (uygulama JPEG gönderiyor).
- Tekrar önleme: aynı fotoğraf önceki sonucu döndürüyor. Sağlayıcı çağrılmıyor, yeni kayıt açılmıyor, kota düşmüyor.
- Üç kademeli güven:
  - 0,6 ve üstü: tek tür.
  - 0,2–0,6: olası türler.
  - 0,2'nin altı ya da bitki değil: "Bitki tanınamadı" ve çekim ipuçları. Tanınmayan fotoğraf ücretsiz kotadan düşmüyor.
- R2 sürücüsü (S3 API, gizli kova). Üretimde yerel depolama yasak.
- Türkçe ad sözlüğü: 642 bilimsel ad için Wikidata'dan Türkçe ad ve Wikidata, GBIF ve POWO kimlikleri alındı; Türkçe adı olan 260 tür seed'de.
  - Tanıma sonucunda ad sırası: bakım kartı → Wikidata → sağlayıcı → bilimsel ad.
- Uygulama: "Olası türler" ve "Bitki tanınamadı" ekranları, tekrar notu.
- Sahte sağlayıcı, yeşil içermeyen fotoğrafa "bitki değil" diyor.
- `ASSISTANT_MODEL`'in kodda varsayılanı Haiku'ydu; ADR 0009, README ve `.env.example` Opus 5.5 diyordu. Kod belgelere uyduruldu (`claude-opus-5-5`). Asistan sahte sürücüyle çalıştığı için maliyet etkisi yok; model kararı sahipte.
- Testler: API birim 31, API e2e 80. Yeni e2e testleri: tekrar, tanınamadı, olası türler, EXIF ve Wikidata adı. Lint ve tip kontrolü temiz.

Kabul kriterleri:
- Cihazda çekilen fotoğraf Türkçe ad ve bakım kartıyla dönüyor: emülatörde galeriden ✔. Sahte sürücüyle; kamera ve canlı sağlayıcı yok.
- R2'deki nesnede EXIF GPS yok: depoya giden dosyada EXIF yok ✔. e2e testinde GPS'li fotoğrafla ve emülatörden gelen dosyada kontrol edildi. Canlı R2 kovasında doğrulanmadı.
- Aynı fotoğraf ikinci kez yüklendiğinde sağlayıcı çağrılmıyor, tek kayıt var ✔ (e2e ve emülatör).
- Bitki olmayan fotoğrafta "Bitki tanınamadı" ve çekim ipuçları çıkıyor ✔ (e2e ve emülatör).
- Onay verilmeden tarama başlamıyor ✔. e2e'de test edildi; emülatörde yeni hesabın ilk taramasında onay ekranı açıldı ve sunucuya tarama isteği gitmedi.

Android emülatörde doğrulanan:
- Yeni hesapla kayıt (2. haftadan kalan) ve onay ekranı.
- Galeriden tanıma.
- Aynı fotoğrafta tekrar notu ve tek kayıt.
- Gri fotoğrafta "Bitki tanınamadı".

iOS simülatörde doğrulanan: "Konum dahil" seçilen fotoğraf sunucuda çözülüp temizleniyor. Demo hesabın haftalık sınırı dolu olduğu için yanıt 402.

Bulgu: Wikidata'da Türkçe ad kapsamı %40, ev bitkilerinde %11. Bu, planın %70 eşiğinin altında. Önlem: uzman onaylı ilk 300 tür ve küratörlük ([ADR 0010](adr/0010-fotograf-hatti-ve-turkce-adlar.md)).

Plandan sapmalar ([ADR 0010](adr/0010-fotograf-hatti-ve-turkce-adlar.md)):
- İmzalı yükleme yerine fotoğraf API üzerinden yükleniyor; EXIF'siz nesneyi böylece sunucu garanti ediyor.
- Kuyruk işi ertelendi.
- Ayrı `Identification` ve `UsageEvent` tabloları yerine `scans` tablosu kullanılıyor.

Doğrulanmayan:
- Canlı R2 kovası ve canlı sağlayıcı (Kindwise, Pl@ntNet).
- "Olası türler" ekranı cihazda: sahte sağlayıcı bu skoru üretmiyor; e2e'de test edildi.
- Kamera ve iOS'ta yeni ekranlar.

Bekleyen (sahipte):
- R2 hesabı ve kova.
- Sağlayıcı anahtarları: Kindwise deneme kredisi, Pl@ntNet.
- Ev bitkilerinin Türkçe adları için ziraat mühendisi.

### 4. hafta (yeni plan)

Tamamlanan ([ADR 0011](adr/0011-bakim-takvimi-ve-hatirlaticilar.md)):
- Bitkinin yeri: konum tipi, ışık ve saksı. Şehir kullanıcıda (81 il, isteğe bağlı, konum izni yok).
- Yerleşim önerileri: ışık, yer, gece sıcaklığı ve saksı, bakım kartıyla karşılaştırılarak.
- Sulama aralığı mevsime (yaz/kış), dış mekâna ve saksıya göre her gün yeniden hesaplanıyor. Kullanıcı kendi aralığını verebiliyor ve otomatiğe geri dönebiliyor.
- `GET /v1/my/schedule`: 14 günlük sulama takvimi, günlere göre; geciken bitki bugüne yazılıyor.
- `PATCH /v1/me`: şehir ve hatırlatma saati. `GET /v1/cities`: 81 il.
- Uygulama:
  - "Bitki ekle / düzenle" ekranı: tür arama, ad, yer, ışık, saksı, sulama aralığı. Tanıma sonucundan, ansiklopediden ve Bitkilerim'deki "Ekle"den açılıyor.
  - Günde tek toplu yerel bildirim; 14 gün ve en fazla 50 bekleyen istek. Açılışta, öne gelişte ve her bakım değişikliğinde yeniden kuruluyor. Çıkışta siliniyor.
  - İzin, ilk bitkiden sonra kısa açıklamayla bir kez isteniyor. Android'de önce bildirim kanalı açılıyor; tam zamanlı alarm izni yok.
  - Bildirimler kapalıysa Bitkilerim'de not ve izin bağlantısı var; "Bugün su bekleyenler" listesi ve "Hepsini suladım" çalışıyor.
  - Profil: hatırlatma saati (08:00–21:00), sıradaki hatırlatma, şehir.
- Testler: API birim 31, API e2e 83 (yeni: yerleşim ve aralık, takvim, tercihler). Lint, tip kontrolü ve expo-doctor temiz.

Kabul kriterleri:
- 10 bitki eklenince günde tek bildirim geliyor: takvim günlere göre gruplanıyor ve her gün için tek bildirim kuruluyor (e2e ve kod). 10 bitkili hesapla cihazda denenmedi; ücretsiz planda sınır 5 bitki.
- iOS'ta bekleyen istek sayısı 50'yi geçmiyor ✔ (kodda sınır; simülatörde sıradaki hatırlatma doğru: 30 Ekim 09:00, 1 bitki).
- İzin reddedilince uygulama içi görev listesi çalışıyor ✔ ("Bildirimler kapalı" notu ve liste, iOS simülatöründe).
- Android'de yeniden başlatmadan sonra hatırlatıcılar korunuyor: expo-notifications'ın açılış alıcısı manifestte ✔. Emülatörde yeniden başlatma denenmedi; emülatör bu turda dışarıdan kapandı.
- Kapsam v2 onaylandı: **sahibin onayı bekleniyor.** [kapsam.md](kapsam.md) dondurmaya hazır.

iOS simülatöründe doğrulanan:
- Bildirim izni ve sıradaki hatırlatma.
- Hatırlatma saati ve şehir seçimi (Antalya).
- Bitki düzenleme: az ışık ve pişmiş toprak seçilince aralık 14 günden 11 güne indi ve ışık önerisi çıktı.

Android emülatöründe doğrulanan: yeni hesapla kayıt, "Ekle" düğmesi, elle ekleme ekranı ve tür arama (sardunya). Bitkiyi kaydederken emülatör dışarıdan kapandı.

Gelen istek: açılış animasyonu ve fal-app düzeninde giriş, kayıt ve üyelik akışı (Apple, Google, telefon, e-posta). Kapsama alındı ([kapsam.md](kapsam.md)); 5. haftanın önüne geçiyor.

### Gelen istek: açılış, giriş, kayıt ve üyelik akışı (25 Ekim)

[ADR 0012](adr/0012-giris-kayit-ve-uyelik-akisi.md). fal-app'in düzeni ve mantığı, EverBloom'un içeriği ve renkleriyle.

Tamamlanan:
- Yeni uygulama ikonu (minimal filiz), Android adaptif ve tek renk ikon; açılış ekranıyla aynı zemin.
- Açılış animasyonu:
  - Çizilerek beliren ve dolan filiz, inci parlaması, ışıltılar, nefes alan hale.
  - Serif "EverBloom" ve altın parıltı, ardından slogan; sonda büyüme ve solma.
  - "Hareketi azalt" açıkken sakin bir solma.
- Akış: karşılama → beş soru (bellekte) → gizlilik (aydınlatma ayrı, açık rıza isteğe bağlı) → plan ön seçimi → hesap → onboarding üyelik ekranı → uygulama.
- Hesap yolları:
  - Apple (sistem düğmesi, nonce).
  - Google (resmî G).
  - Telefon: +90, 6 haneli SMS kodu, 60 sn yeniden gönderme, iOS oneTimeCode, Android SMS Retriever modülü; SMS izni yok.
  - E-posta.
- Dönen kullanıcı: cihaz damgası, "Tekrar hoş geldin", son kullanılan yol üstte; girişte ödeme ekranı yok.
- Kök yönlendirme saf bir fonksiyon; 22 durumluk tablo testi var.
- Sunucu:
  - Apple ve Google jeton doğrulaması (JWKS).
  - Apple erişim iptali: şifreli jeton ve yeniden deneme.
  - Telefon kodu: tavanlar; numaranın yalnız özeti saklanıyor.
  - `GET /v1/app-config`; `/v1/me` için `missingSteps`, `careProfile`, `signInMethod`.
  - Bütün yeni yollar kapalı başlıyor.
- İzin ön ekranları tek "Devam" düğmeli. Kamera izni reddedilince galeri öneriliyor.
- Gereksiz Android izinleri kaldırıldı: mikrofon, üstte gösterme, depolama.
- Testler:
  - API birim 48, API e2e 96: yeni kimlik testleri ve varsayılanın kapalı kaldığının testi.
  - Uygulama Jest 66: ekran testleri, yönlendirme tablosu, oturum akışı.
  - Lint'te hata yok (kalan uyarılar şablondan geliyor); tip kontrolü ve expo-doctor temiz.
- iOS simülatöründe uçtan uca denendi:
  - Açılış animasyonu, karşılama, sorular, gizlilik ve plan.
  - Telefonla hesap açma; üyelik ekranından hem "Şimdi değil" hem "Şimdilik ücretsiz devam et" ile çıkış.
  - Açık rıza ve şehir hesaba geçiyor.
  - Çıkışta "Tekrar hoş geldin" geliyor; hesap silinince karşılama ekranına dönülüyor.
  - Android APK derleniyor, ama arayüz Android'de denenmedi.
- Denemede ve lint'te bulunan hatalar düzeltildi:
  - Adı olmayan hesap "Merhaba EverBloom" diye selamlanıyordu; ad artık boş kalıyor.
  - Telefon numarası çıkıştan sonra bellekte kalıp sonraki kişinin alanına doluyordu; girişte ve çıkışta siliniyor.
  - Şablonun düğmesi tema kancasını yalnız ikon varken çağırıyordu (kanca sırası bozulabiliyordu); açılış animasyonundaki çizgi yardımcısı da kanca kuralına uyduruldu.

Açık kalanlar ve sahibin kararları: SMS sağlayıcısı (Netgsm hesabı), ödeme duvarı modu (şimdilik ücretsiz çekirdek), Apple ve Google geliştirici hesapları, RevenueCat ve mağaza ürünleri (7. hafta), hukuk metinleri (taslak). Ayrıntı ADR 0012'de.

## Bitki mağazası dönemi (1–4. haftalar)

Takvim: [reports/Bitki mağazası pazar ve MVP planı.md](../reports/Bitki%20mağazası%20pazar%20ve%20MVP%20planı.md).

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
