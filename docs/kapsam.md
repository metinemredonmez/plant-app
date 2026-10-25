# MVP kapsamı v2: yapay zekâlı bitki bakımı

- Tarih: 25 Ekim 2026 (taslak; planın 4. hafta sonunda dondurulacak)
- Kaynak: [reports/Yapay zekâlı bitki uygulaması MVP planı.md](../reports/Yapay%20zekâl%C4%B1%20bitki%20uygulamas%C4%B1%20MVP%20plan%C4%B1.md) ve [ADR 0009](adr/0009-yapay-zekali-bakim-uygulamasi.md)
- Önceki kapsam (bitki mağazası) `v0-ticaret` etiketinde

Uygulama bakım ve bilgi üzerine kurulu. Ürün ya da bitki satışı yok. Gelir yalnızca aylık ve yıllık mağaza aboneliğinden geliyor.

## Ücretsiz ve premium

| Alan | Ücretsiz | Premium | Durum |
|---|---|---|---|
| Fotoğrafla tanıma | Haftada 3 tanıma, ilk üç aday ve güven skoru | Adil kullanım (günde 50 tarama) | API hazır (sahte sürücüyle); sağlayıcı denemesi 1. hafta |
| Türkçe bakım bilgisi | Bütün bakım kartları: ışık, sulama, zorluk, evcil hayvan, balkon notu | Aynı | 24 tür taslak (uzman kontrolü bekliyor); hedef ~500 tür |
| Bitkilerim ve hatırlatıcılar | 5 bitkiye kadar, günlük toplu hatırlatma | Sınırsız bitki, bakım günlüğü | API hazır; mobil bildirimler 4. hafta |
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

- Apple ve Google ile giriş (birlikte)
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
