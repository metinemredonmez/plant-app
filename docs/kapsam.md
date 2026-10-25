# MVP kapsamı v2: yapay zekâlı bitki bakımı

- Tarih: 25 Ekim 2026. **Durum: dondurmaya hazır taslak; sahibin onayı bekleniyor.** Plan kapsamı 4. hafta sonunda donduruyor. Onaydan sonra bir madde ancak eşit büyüklükte bir madde çıkarılarak eklenebilir.
- Kaynak: [reports/Yapay zekâlı bitki uygulaması MVP planı.md](../reports/Yapay%20zekâl%C4%B1%20bitki%20uygulamas%C4%B1%20MVP%20plan%C4%B1.md) ve [ADR 0009](adr/0009-yapay-zekali-bakim-uygulamasi.md)
- Önceki kapsam (bitki mağazası) `v0-ticaret` etiketinde

Uygulama bakım ve bilgi üzerine kurulu. Ürün ya da bitki satışı yok. Gelir yalnızca aylık ve yıllık mağaza aboneliğinden geliyor.

## Ücretsiz ve premium

| Alan | Ücretsiz | Premium | Durum |
|---|---|---|---|
| Fotoğrafla tanıma | Haftada 3 tanıma, ilk üç aday ve güven skoru; tanınmayan ve tekrar gönderilen fotoğraf sayılmaz | Adil kullanım (günde 50 tarama) | API ve uygulama hazır (sahte sürücüyle): EXIF silme, tekrar önleme, üç kademeli güven ([ADR 0010](adr/0010-fotograf-hatti-ve-turkce-adlar.md)); sağlayıcı denemesi bekliyor |
| Türkçe bakım bilgisi | Bütün bakım kartları: ışık, sulama, zorluk, evcil hayvan, balkon notu | Aynı | 24 tür taslak (uzman kontrolü bekliyor); hedef ~500 tür. Kartı olmayan 260 türün Türkçe adı Wikidata'dan; ev bitkilerinde kapsam %11 |
| Bitkilerim ve hatırlatıcılar | 5 bitkiye kadar; tanımadan, ansiklopediden ya da elle ekleme; konum, ışık, saksı; günde tek toplu hatırlatma | Sınırsız bitki, bakım günlüğü | Hazır ([ADR 0011](adr/0011-bakim-takvimi-ve-hatirlaticilar.md)); mevsime ve saksıya göre sulama aralığı, yerleşim önerileri |
| Hastalık ve zararlı teşhisi | 1 deneme teşhisi | Teşhis ve 5–7 günlük iyileşme takibi | API hazır; ilaç adı ve dozu yok |
| Yapay zekâ bakım asistanı | Ayda 10 mesaj | Ayda 300 mesaj (adil kullanım) | API hazır (sahte sürücüyle) |
| Hava uyarıları | Şehre göre don ve sıcak uyarısı | Aynı | 10. hafta |
| Hesap | E-posta ve OTP, uygulama içi ve web üzerinden silme | Aynı | Hazır; silme bitkileri, taramaları ve fotoğrafları da siliyor |

**Fiyat:** aylık ₺149,99 (denemesiz) ve 7 gün denemeli yıllık ₺599,99. Haftalık ve ömür boyu plan yok. Fiyatlar üç ayda bir enflasyona göre gözden geçirilecek.

**Kapsam dışı:** bitki ya da ürün satışı, satış bağlantısı, reklam, çiftçi ve tarla segmenti, ilaç adı ve dozu.

## Kırmızı çizgiler

- Teşhis ve asistan bitki koruma ürünü (zirai ilaç) adı, dozu ya da uygulama talimatı vermez. Gerekirse ziraat mühendisine yönlendirir.
- Fotoğraf ya da soru, açık ve sürümlü onay olmadan hiçbir yapay zekâ sağlayıcısına gönderilmez.
- Yapay zekâ anahtarları yalnızca sunucuda durur; uygulama paketine girmez.
- Paywall'da faturalanan tutar en belirgin fiyattır. Deneme koşulları açık yazılır, deneme bitmeden hatırlatma yapılır, iptal kolaydır.

## Faz 2

- Sesli soru
- Fotoğraflı büyüme zaman çizelgesi
- Saatlik ve mikro iklim uyarıları
- İnsan uzman danışmanlığı
- Işık ölçer, AR, çevrimdışı model
- Tek seferlik teşhis paketi
- Web'de arama motoruna açık bakım sayfaları

## Gelen istekler

| Tarih | İstek | Karar |
|---|---|---|
| 25 Eki 2026 | Mağaza değil, yapay zekâlı bitki uygulaması; ürün satışı yok, abonelik var | Kabul; kapsam v2 ([ADR 0009](adr/0009-yapay-zekali-bakim-uygulamasi.md)) |
| 25 Eki 2026 | Odak bakım ve bilgi | Kabul; bakım kartları ücretsiz, tanıma bilgiye giriş kapısı |
| 25 Eki 2026 | Tasarım için yedekteki Expo 54 şablonları (Luna, Picaso, Caloria) | Kabul; Picaso ana kabuk, EverBloom'un bitki teması. Şablon lisansı mağazadan önce teyit edilecek |
| 25 Eki 2026 | Açılış animasyonu ve fal-app düzeninde karşılama, sorular, KVKK, plan ön seçimi, Apple, Google, telefon ve e-postayla hesap, onboarding paywall'u, dönen kullanıcı girişi | Kabul (sahibin isteği). Faz 2'deki "Apple ve Google ile giriş" MVP'ye alındı. Dondurmadan önce geldiği için takas gerekmiyor; takvim etkisi ilerleme.md'de |
