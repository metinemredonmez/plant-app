# ADR 0003: Eski API sözleşmesini birebir korumak

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026

## Bağlam

Expo şablonu 23 uca, belirli yollara ve yanıt şekillerine sıkı sıkıya bağlı. Şekiller bozulunca uygulama hata vermiyor, sessizce boş ekran gösteriyor ya da çöküyor. İki seçenek vardı: modern bir REST API tasarlayıp frontend'i baştan yazmak, ya da eski sözleşmeyi taklit edip frontend'i yalnızca zorunlu yerlerde değiştirmek.

## Karar

Backend eski yolları (`/api/...`) ve yanıt şekillerini birebir taklit edecek. Sözleşme `packages/contract` içinde kodla tanımlı:

- `src/endpoints.ts`: 23 ucun listesi
- `src/schemas.ts`: zod şemaları ve uygulamayı kıran kurallar
- `src/fixtures/`: mock sunucu, seed ve testlerin ortak verisi

Kural listesinin tamamı [packages/contract/README.md](../../packages/contract/README.md) dosyasında. En önemlileri şunlar: liste uçları çıplak dizi döner, başarı yalnızca 200'dür, `rating` sayıdır, `oldPrice` yoksa alan gönderilmez, sipariş satırının `id`'si bitki id'sidir, tarihler `GG.AA.YYYY` biçiminde gelir.

Sözleşmede bilerek iki genişletme yapıldı. Uygulama tanımadığı alanları yok saydığı için ikisi de geriye dönük uyumlu:

1. `login` yanıtına `token` ve `refreshToken`, e-posta doğrulama yanıtına `resetToken` eklendi (3. ve 4. haftanın güvenlik düzeltmeleri için).
2. Bitkilere bakım alanları eklendi: `heightCm`, `light`, `watering`, `petSafe`, `careLevel` (pazar araştırmasının dersleri).

## Sonuçlar

- Mock sunucu ve NestJS API aynı şemalara karşı test ediliyor; biri sözleşmeden saparsa test kırılıyor.
- Güvenlik açıkları (statik token, IDOR, şifre sıfırlama) bu kararla korunmuyor. Takvimdeki düzeltmelerle sözleşme sürüm sürüm değişecek. Her değişiklik önce `packages/contract` içinde yapılıp sonra iki tarafa uygulanacak.
- Tarihler sunucuda biçimlendirildiği için ileride İngilizce arayüz gerekirse istemcinin ISO tarih biçimlendirmeyi öğrenmesi gerekecek.
