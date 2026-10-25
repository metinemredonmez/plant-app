# ADR 0010: Fotoğraf hattı, tekrar önleme, güven eşikleri ve Türkçe ad sözlüğü

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026
- Kaynak: [reports/Yapay zekâlı bitki uygulaması MVP planı.md](../../reports/Yapay%20zekâl%C4%B1%20bitki%20uygulamas%C4%B1%20MVP%20plan%C4%B1.md), 3. hafta ve "Fotoğraftan bakım kartına beş adımlık hat"

## Karar

### Fotoğraf sunucuda temizleniyor

- Uygulama fotoğrafı 1024 piksele küçültüp EXIF'siz JPEG olarak gönderiyor. Sunucu buna güvenmiyor ve her fotoğrafı `sharp` ile yeniden kodluyor ([photo.ts](../../apps/api/src/scans/photo.ts)):
  - Yön bilgisi piksellere uygulanıyor.
  - En uzun kenar en fazla 1280 piksel oluyor.
  - Fotoğraf %80 kaliteyle JPEG olarak yazılıyor.
  - Hiçbir metadata yazılmıyor: EXIF, GPS ve kamera bilgisi depoya da sağlayıcıya da gitmiyor.
- Kabul edilen türler JPEG, PNG ve WebP. HEIC çıkarıldı, çünkü sharp'ın hazır paketleri HEIC (HEVC) çözmüyor. Uygulama zaten her fotoğrafı JPEG'e çeviriyor.
- Çözülemeyen dosya 422 alıyor ("Fotoğraf okunamadı").
- Sıra: oturum → onay → temizleme → tekrar kontrolü → kota → depolama → sağlayıcı. Onay verilmeden fotoğraf çözülmüyor, saklanmıyor, gönderilmiyor.

### Tekrar önleme

- Temizlenmiş fotoğrafın SHA-256 özeti `scans.image_hash` sütununda.
- Aynı kullanıcı aynı fotoğrafı yeniden gönderirse önceki sonuç `duplicate: true` ile dönüyor. Bu karşılaştırma aynı tür taramada, teşhiste de aynı bitki için yapılıyor. Sağlayıcı çağrılmıyor, yeni kayıt açılmıyor, kota düşmüyor.
- Özet kullanıcılar arasında karşılaştırılmıyor.
- Uygulama bu durumda "Bu fotoğrafı daha önce taramıştın; önceki sonucu gösteriyoruz, hakkından düşmedi." diyor.

### Güven eşikleri

Planın başlangıç değerleri kullanılıyor. Kendi verimizle ayarlanacaklar.

| İlk adayın skoru | `outcome` | Uygulama |
|---|---|---|
| ≥ 0,6 | `identified` | Tek tür ve bakım kartı, "Bitkilerime ekle" |
| 0,2–0,6 | `possible` | İlk üç olası tür (dokununca bakım kartı) ve "İkinci fotoğrafı çek" |
| < 0,2 ya da bitki değil | `not_recognized` | "Bitki tanınamadı" ve dört çekim ipucu |

- Önceki tek eşik 0,5 idi. `confident` alanı uyumluluk için duruyor (`outcome === 'identified'`).
- Tanınmayan fotoğraf ücretsiz haftalık kotadan düşmüyor (`scans.chargeable = false`). Yalnızca günlük adil kullanım sınırına sayılıyor.
- Teşhiste bitki olmayan fotoğraf da deneme teşhisini harcamıyor.

### Depolama

- `ImageStorage` arkasında iki sürücü var: `local` ve `r2` ([image-storage.ts](../../apps/api/src/storage/image-storage.ts)).
- R2 gizli bir kova; S3 API'si `@aws-sdk/client-s3` ile, Cloudflare'in örneğindeki ayarlarla kullanılıyor. Herkese açık bağlantı yok.
- Hesap silmede kullanıcının klasörü sayfa sayfa listelenip siliniyor; ikisi de istek başına en fazla 1.000 anahtar alıyor.
- Üretimde `STORAGE_DRIVER=local` yasak, çünkü sunucu diski kalıcı değil. `r2` için dört ayar zorunlu.
- **Canlı bir R2 kovasıyla denenmedi.** Birim testi istemciyi taklit ediyor. Hesap sahibinde.

### Sahte sağlayıcı

- Geliştirme sürücüsü (`VISION_DRIVER=fake`) artık fotoğrafa bakıyor: 32×32 küçük resimde belirgin yeşil piksel oranı %5'in altındaysa sonuç "bitki değil".
- Böylece "Bitki tanınamadı" ekranı anahtarsız denenebiliyor. Üretimde bu sürücü yine yasak.

## Plandan sapmalar

- **İmzalı yükleme yerine fotoğraf API'den geçiyor.**
  - Plan, uygulamanın R2'ye imzalı bağlantıyla doğrudan yüklemesini öneriyordu. O durumda kovaya istemcinin gönderdiği bayt girer ve "R2'deki nesnede EXIF GPS yok" kriteri istemciye kalır.
  - Sağlayıcıya göndermek için sunucunun fotoğrafı zaten okuması gerekiyor.
  - Fotoğraf yaklaşık 150 KB olduğu için API'den geçmesi MVP ölçeğinde sorun değil.
  - Trafik büyürse yol şu: imzalı yükleme, ardından sunucunun indirip temizlemesi ve üzerine yazması.
- **Kuyruk işi ertelendi.**
  - Tanıma, kullanıcı ekranda beklerken yapılıyor. Kuyruk bekleme süresini kısaltmaz, uygulamaya sonucu tekrar tekrar sorma (polling) yükü ekler.
  - Sağlayıcı çağrısında 20 saniyelik zaman aşımı var ve başarısız çağrı kotadan düşmüyor.
  - pg-boss şu durumlardan biri ortaya çıkınca eklenecek: zamanlanmış işler (iyileşme takibi, 10. haftada hava uyarıları), ya da canlı sağlayıcıda gecikme veya hata oranının yüksek çıkması.
- **Ayrı `Identification` ve `UsageEvent` tabloları açılmadı.** `scans` tablosu ikisini de karşılıyor: sonuç, sağlayıcı, fotoğraf özeti ve `chargeable`. Kotalar bu tablodan sayılıyor. "Aynı fotoğrafta tek kayıt" kriteri bu tabloda sağlanıyor.

## Türkçe ad sözlüğü (Wikidata)

- [species-list.txt](../../apps/api/prisma/wikidata/species-list.txt): Türkiye'de evde, balkonda, bahçede, sofrada ve parklarda görülen 617 tür ve 25 cins. Hâlâ yaygın kullanılan eş anlamlılar da listede (ör. `Dracaena trifasciata` yanında `Sansevieria trifasciata`).
- `pnpm --filter @everbloom/api species:names` şunları Wikidata'dan (CC0 1.0) alıp [tr-names.json](../../apps/api/prisma/wikidata/tr-names.json) dosyasına yazıyor:
  - Türkçe etiket ve eş anlamlılar
  - Wikidata, GBIF ve POWO kimlikleri

  Sorgu bilimsel ad (P225) üzerinden 80'lik gruplarla yapılıyor, yaklaşık 20 saniye sürüyor. Melezler için Wikidata'nın yazımları da deneniyor ("Mentha ×piperita", "Hibiscus × rosa-sinensis").
- Seed, Türkçe adı olanları `plant_names` tablosuna yüklüyor. 24 bakım kartının hepsine de Wikidata, GBIF ve POWO kimlikleri ekleniyor.
- Bir etiket ancak Latince değilse Türkçe ad sayılıyor. Latince sayılanlar:
  - bilimsel adın kopyası
  - listedeki bir cinsle başlayan eş anlamlı ("Mespilus japonica")
  - aynı epiteti tekrar eden ad ("Lagerstromia indica")
  - "×" içeren yarı Latince ad

  Etiket Latince ama Türkçe bir eş anlamlısı varsa o kullanılıyor ("Iris" → Süsen).
- Tanıma sonucunda ad şu sırayla seçiliyor: bakım kartı → Wikidata → sağlayıcının ortak adı → bilimsel ad.
- Adlar uzman kontrolünden geçmedi. Bazıları yanlış ya da çeşit adı ("Elwoodii Çamı"). Admin panelinde (8. hafta) düzeltilecek.

### Bulgu: Türkçe ad kapsamı %40

642 adın 640'ı Wikidata'da bulunuyor, ama yalnızca **260'ının (%40)** gerçek bir Türkçe adı var.

| Grup | Türkçe adı olan |
|---|---|
| İç mekân | 20/181 (%11) |
| Kaktüs ve sukulent | 7/62 (%11) |
| Balkon ve bahçe | 58/172 (%34) |
| Sebze, meyve ve aromatik bitkiler | 99/135 (%73) |
| Park, sokak ve bahçe ağaçları | 57/67 (%85) |
| Cins düzeyi | 19/25 (%76) |

- Wikidata sofra bitkilerinde ve ağaçlarda işe yarıyor, ama uygulamanın ana kitlesi olan ev bitkilerinde neredeyse boş: Monstera, pothos, barış çiçeği ve zamioculcas'ın Türkçe etiketi yok.
- Kapsam, planın risk tablosundaki %70 eşiğinin altında. Planın önlemi geçerli:
  - Lansman, uzman onaylı ilk 300 türle yapılır.
  - Ev bitkilerinin Türkçe adlarını ziraat mühendisi ya da küratör yazar.
  - Kindwise'ın `language=tr` ortak adları ve Pl@ntNet, 1. haftanın 50 fotoğraflık canlı denemesinde ayrıca ölçülmeli. Bu deneme hâlâ anahtar bekliyor.
