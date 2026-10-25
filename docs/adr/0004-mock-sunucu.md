# ADR 0004: Bağımlılıksız mock sunucu

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026

## Bağlam

Şablonun demo sunucusu (`everbloom.rn-admin.site`) kapalı. Mobil tarafın çalışması gerçek API'nin bitmesini beklememeli. Prism gibi OpenAPI tabanlı mock araçları için önce bir OpenAPI dokümanı gerekiyor, ama elimizdeki sözleşme koddan çıkarıldı.

## Karar

`packages/contract/mock` altında `node:http` ile yazılmış küçük bir sunucu:

- 23 ucun hepsi, durumu bellekte tutarak çalışıyor: kayıt, giriş, sipariş, yorum, profil güncelleme, OTP, hesap silme.
- Sipariş toplamını istemcinin gönderdiği değerden değil, katalog fiyatlarından hesaplıyor (gerçek API'nin kuralı).
- Görselleri sunuyor ve göreli yolları isteğin `Host` başlığına göre mutlak adrese çeviriyor. Böylece simülatör ve LAN'daki telefon aynı veriyle çalışıyor.
- `MOCK_DELAY_MS` ile yapay gecikme eklenebiliyor.
- Test hesabı `demo@everbloom.test` / `demo1234`, OTP her zaman `12345`.

Mobil uygulama adresi artık `EXPO_PUBLIC_API_URL` ortam değişkeninden okuyor (`apps/mobile/.env.local`). Varsayılan değer mock sunucu.

## Sonuçlar

- Tek çalışma zamanı bağımlılığı zod; istek gövdeleri sözleşme şemalarıyla doğrulanıyor.
- Mock gerçek API'nin yerine geçmiyor: kimlik doğrulama, kalıcılık ve ödeme yok. Amacı frontend'i ve sözleşme testlerini backend'den bağımsız çalıştırmak.
