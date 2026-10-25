# ADR 0006: Şema v1, katalog uçları ve API iskeleti (2. hafta)

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026

## Bağlam

2. haftanın hedefi, uygulamanın ana sayfa, kategori, mağaza, filtre ve arama ekranlarının gerçek veritabanından dolması. Raporun şema taslağı ve [ADR 0003](0003-eski-sozlesme-uyumlulugu.md)'teki sözleşme kuralları temel alındı.

## Kararlar

**Veri modeli** ([apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma))

- Raporun taslağındaki 20 model eksiksiz alındı: kullanıcı, oturum, OTP, tedarikçi, bitki, görsel, lookup tabloları, slayt, banner, yorum, promosyon, sipariş, ödeme, sözleşme onayı, rıza. Sonraki haftalar yeni tablo değil, yeni uç ekleyecek.
- Tablolar ve çok kelimeli kolonlar PostgreSQL'de snake_case (`@@map`/`@map`). Admin, raporlama ve elle SQL için okunaklı.
- Para kuruş cinsinden `Int`. API TL'ye çevirip sayı olarak gönderiyor (74950 → 749.5).
- Bitkiye `slug` eklendi (benzersiz). Seed bununla idempotent çalışıyor; ileride SEO ve admin adresleri için de kullanılacak.
- Görsel alanları URL değil nesne anahtarı (`monstera.jpg`) tutuyor. URL'yi API `ASSET_BASE_URL` ile üretiyor. Geliştirmede `LOCAL_ASSET_DIR` verilirse API görselleri `/images` altında kendisi sunuyor. Üretimde R2/CDN adresi yazılacak.
- Işık ve bakım zorluğu enum. Yanıtta Türkçe etikete çevriliyor ("Parlak, dolaylı ışık", "Çok kolay"). Böylece ileride ışık ve zorluk filtresi veritabanında yapılabilecek.

**Uçlar**

- 8 katalog ucu: `plants`, `categories`, `colors`, `pot/types`, `plant/types`, `slides`, `banners`, `promocodes`. Planda 7 uç vardı. `promocodes` eklendi, çünkü sepet sekmesi bu uç hata verirse tamamen hata ekranı gösteriyor.
- Stoğu 0 olan bitkiler listelenmiyor. Şablonda "tükendi" arayüzü yok; listelenirse kullanıcı ödeme adımında hata alırdı.
- `promocodes` yalnızca sahibi olmayan, süresi geçmemiş ve kullanım limiti dolmamış kodları döndürüyor. Kodun doğrulanması 4. haftaya kadar hâlâ cihazda yapılıyor.

**İskelet**

- Ortam değişkenleri açılışta zod ile doğrulanıyor (`src/config/env.ts`). Bozuk bir `.env` ile uygulama hiç başlamıyor.
- Loglama nestjs-pino ile yapılıyor. Geliştirmede okunaklı tek satır, üretimde JSON. `authorization` ve `cookie` başlıkları maskeleniyor (KVKK). `/health` istekleri loglanmıyor.
- Bütün hatalar `{message}` biçiminde dönüyor (`LegacyErrorFilter`). Beklenmeyen hatalar loglanıyor ve istemciye genel bir mesaj gidiyor.
- "Eski uçlarda başarı = 200" kuralı ilk POST ucuyla (3. hafta, giriş/kayıt) bir `@LegacyPost` dekoratörü olarak gelecek. 2. haftada POST ucu yok.

**Testler**

- Eşleyici birim testleri: kuruş, `oldPrice` kuralı, Türkçe etiketler, tarih biçimi.
- Sözleşme e2e testleri: 8 ucun her biri ortak zod şemasından geçiyor. Alan yapısı snapshot ile sabitleniyor. Snapshot değerleri değil türleri kaydediyor; bu yüzden seed değişince test kırılmıyor, sözleşme bozulunca kırılıyor. Ek olarak: stoksuz bitki görünmüyor, süresi geçmiş kod görünmüyor, ilişki isimleri lookup listelerinde var, her slayt ve banner promosyonunun ürünü var.

**Mock sunucuda upstream modu**

- Uygulama giriş yapmadan ana sayfayı göstermiyor ve her sekme değişiminde `GET /api/user/:id` çağırıyor. Bu uçlar 3. haftada geliyor.
- API'ye geçici, kimlik doğrulamasız bir kullanıcı ucu eklemek yerine mock'a upstream modu eklendi. `MOCK_UPSTREAM=http://localhost:4100` verilince API'nin hazır uçları API'ye yönlendiriliyor, kalanlar mock'ta kalıyor.
- Uygulama uç uç backend'e geçiyor. Her hafta `API_ENDPOINTS` listesine yeni uçlar eklenecek.

**Bağımlılıklar** (25 Ekim 2026)

- vitest 4 → 5, dotenv 17 → 18, `@types/node` 22 (prod Node sürümüyle uyumlu) olarak güncellendi.
- Prisma 7.10.1'de sabit (ADR 0002).
- TypeScript 6'da kalıyor. NestJS 12 CLI bu sürümü seçiyor; TypeScript 7'nin (yeni yerel derleyici) decorator metadata desteği ayrıca doğrulanmadan geçilmeyecek.

## Sonuçlar ve açık işler

- Planın 2. hafta maddelerinden GitHub Actions iş akışı yazıldı ([.github/workflows/ci.yml](../../.github/workflows/ci.yml)). Proje henüz bir git deposu olmadığı için hiç çalıştırılmadı. Railway + Neon staging ortamı ve Sentry senin hesaplarını gerektiriyor, açılmadı.
- Görseller hâlâ şablondan kırpılmış 5 fotoğraf. Gerçek ürün fotoğrafları 10. haftada.
- Puanlar seed'den gelen örnek değerler. 4. haftada yorumlardan hesaplanacak.
