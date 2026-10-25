# MVP kapsamı (donduruldu)

- Dondurma tarihi: 25 Ekim 2026 (takvimin 4. hafta sonu karar kapısı)
- Kaynak: raporun "MVP'de olacaklar, sonraya kalanlar" tablosu ve 1–4. haftada alınan kararlar

Bundan sonra gelen her yeni istek aşağıdaki **Faz 2 listesine** yazılır ve pilottan (25 Ocak 2027 haftası) önce yapılmaz. İstisna yalnızca hukuki zorunluluklar ve güvenlik açıklarıdır. Bir maddeyi MVP'ye almak için eşit büyüklükte bir maddenin çıkarılması gerekir.

## MVP (pilot)

| Alan | Kapsam | Durum |
|---|---|---|
| Katalog | 30–60 SKU, her boy ayrı kayıt, bakım alanları, gerçek fotoğraf | Veri modeli ve uçlar hazır; geliştirme kataloğu 41 bitki; gerçek fotoğraflar 10. hafta |
| Hesap | E-posta ve telefon doğrulama, JWT oturumları, uygulama içi ve web üzerinden hesap silme | API ve uygulama hazır; web silme formu 10. hafta |
| Şifre | Doğrulama koduyla sıfırlama | Hazır |
| Yorum | Yalnızca teslim almış müşteri, puan ortalaması | Hazır |
| Promosyon | Kod; süre, sahiplik ve kullanım limiti kontrolü | Hazır; siparişte sunucu tarafı uygulama 5. hafta |
| Ödeme | iyzico Checkout Form, kart ve taksit | 5–6. hafta |
| Sipariş | Sunucu tarafı fiyatlama, koşullu stok düşümü | 5. hafta |
| Teslimat | İstanbul, ücretsiz kargo (fiyata dahil), etiket ve takip SMS'i elle | 9–10. hafta |
| Fatura | Paraşüt panelinden elle e-Arşiv, link siparişe kaydediliyor | 10. hafta |
| Hukuk | Ön bilgilendirme, mesafeli satış onayı ve kaydı, KVKK metinleri | 7. hafta |
| Bildirim | İşlem SMS'i ve e-postası | Altyapı hazır (Netgsm, SMTP); sipariş mesajları 7. hafta |
| Bakım | Ürün sayfasında Türkçe bakım kartı | Veri API'de; ekranda gösterim 10. hafta |
| Garanti | Canlı teslim garantisi, WhatsApp/e-posta ile fotoğraflı talep | Operasyon (13. hafta) |
| Hediye | Hediye notu | 6. hafta |
| Admin | Bitki, lookup, banner, slayt, promosyon, yorum gizleme, sipariş durumu, kullanıcı | 8–9. hafta |
| Türkçe | ₺, Türkçe harfler, büyük harf | Hazır; arayüz metinleri İngilizce (Faz 2) |

## Faz 2 ve sonrası

- Expo SDK 56 yükseltmesi ([ADR 0005](adr/0005-expo-sdk-yukseltmesi.md)): MVP içinde **zorunlu**, en geç 11. hafta. Faz 2 değil, ama takvimde ayrıca yer açılmalı.
- Arayüz metinlerinin Türkçeleştirilmesi (şablon İngilizce)
- Boy ve saksı varyantı arayüzü, geniş katalog
- Apple ve Google ile giriş
- Havale/EFT, kayıtlı kart
- Ülke geneli kargo, Geliver API, aynı gün kurye API'si
- Paraşüt API otomasyonu
- Expo push, İYS kaydından sonra pazarlama mesajları
- "Bitkilerim" ve sulama hatırlatıcıları
- Uygulama içi fotoğraflı garanti talebi
- Hediye paketi, ayrı alıcı adresi, özel gün hatırlatıcıları, kurumsal hediye
- Puan, referans, kullanıcı içeriği kredisi, hediye kartı
- Bitki tanıma ve hastalık teşhisi (üçüncü taraf API), abonelik, pazaryeri kanalları, B2B
- Her uç için genel rate limit (şimdilik yalnızca kimlik doğrulama ve OTP uçları sınırlı)

## Dondurmadan sonra gelen istekler

| Tarih | İstek | Karar |
|---|---|---|
| — | — | — |
