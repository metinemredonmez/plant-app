# ADR 0015: Admin paneli

- Durum: Kabul edildi (planın 8. haftası; mağaza hesapları hazır olmadığı için 7. haftanın önüne alındı)
- Tarih: 26 Ekim 2026
- İlgili: [ADR 0007](0007-oturum-ve-yetkilendirme.md), [ADR 0013](0013-teshis-guvenligi-ve-iyilesme-takibi.md), [ADR 0014](0014-asistan-baglam-bildirme-ve-model-secimi.md)

## Bağlam

Plan 8. haftada bir Next.js admin paneli istiyor (TailAdmin, HttpOnly çerez). Panelde olması gerekenler:
- Tür ve bakım kartı yönetimi: Türkçe adlar, eş anlamlılar, zehirlilik, balkon eşikleri.
- Dil modeli taslağından uzman onayına giden akış.
- Bildirilen yanıtlar kuyruğu.
- Kullanıcı görüntüleme ve anonimleştirme.
- Salt okunur abonelik durumu.
- Denetim kaydı.
- Maliyet özeti ve günlük harcama alarmı.

Kabul kriterleri:
- Sahip yardım almadan yeni bir tür ekleyip uygulamada görüyor.
- Her admin yazma işlemi denetim kaydı üretiyor.
- Müşteri token'ı `/admin`'de 403 alıyor.
- Çerez HttpOnly, Secure ve SameSite.
- Harcama eşiği aşılınca alarm e-postası gidiyor.

Plan, 7. haftanın (abonelik) mağaza hesaplarına bağlı olduğunu ve hesaplar hazır değilse iki haftanın yer değiştireceğini söylüyor. Hesaplar hazır değil.

`apps/admin/README.md` eski planda react-admin ve Vite öneriyordu. Yeni plan Next.js dediği için o not geçersiz.

## Karar

### Panel (`apps/admin`)

- Next.js 16.4.2, React 19.3.1, Tailwind 4, pnpm workspace'inde `@everbloom/admin`.
- TailAdmin şablonu indirilmedi. Benzer bir yan menü ve kart düzeni Tailwind ile yazıldı; şablonun dosyası ve lisansı repoya girmedi.
- Panel API'yi yalnız kendi sunucusundan çağırır (sunucu bileşenleri ve server action'lar); tarayıcıya token gitmez.
- **Oturum:** API'nin erişim ve yenileme token'ları iki çerezde. HttpOnly, SameSite=Strict, `Path=/`, üretimde Secure, 12 saat ömür.
  - `src/proxy.ts` (Next 16'da middleware'in adı) oturumu olmayanı giriş sayfasına gönderir.
  - Süresi bir dakikadan az kalan erişim token'ını yeniler ve yeni token'ı aynı istekte sayfaya iletir.
  - Next'in önerdiği gibi bu yalnız iyimser bir kontrol; asıl yetki her API çağrısında API'nin rol kontrolünde.
- **Giriş:** e-posta ve parolayla API'den token alınır, ardından `/v1/admin/me` çağrılır. Müşteri hesabı için çerez yazılmaz, yenileme token'ı iptal edilir ve "Bu hesabın panele girme yetkisi yok" denir.
- **Güvenlik başlıkları:** `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.
- **Formlar:** React 19 işlemden sonra formu sıfırladığı için reddedilen form gönderilen değerlerle geri gelir; uzun bakım kartı formu kaybolmaz.

### API (`/api/v1/admin`)

- Denetleyici düzeyinde `@Roles('ADMIN', 'STAFF')`. Kullanıcılar, maliyet ve denetim uçları yalnız `ADMIN`; uzman (`STAFF`) bakım kartlarını ve bildirimleri yönetir.
- **Bakım kartları:**
  - **Elle ekleme:** tür hemen yayında, uygulamada "uzman onayı bekliyor" olarak görünür.
  - **Taslak:** `POST species/drafts` dil modelinden yapılandırılmış çıktıyla bir kart ister (`messages.parse`, zod şeması, `CARD_DRAFT_MODEL`). Kartın metinleri bitki koruma süzgecinden geçer, değer aralıkları denetlenir. `DRAFT` olarak saklanır ve onaylanana kadar uygulamanın aramasında, kart sayfasında ve tanıma eşleşmesinde yer almaz.
  - **Onay:** `POST species/:id/approve` kartı onaylı ve yayında yapar; onaylayanı ve zamanı kaydeder.
  - **Güvenlik:** elle yazılan kartta da ürün adı, doz ya da ilaçlama zamanı varsa kayıt 422 ile reddedilir.
  - **Düzeltme:** `PATCH` yalnız gönderilen alanları değiştirir; listeler (diğer adlar, sık sorunlar) korunur.
- **Bildirimler:** açık ve kapatılmış kuyruk; her yanıtın yanında yanıtlanan soru da var. Kapatırken ne yapıldığı yazılır.
- **Kullanıcılar:** e-posta, ad ya da kullanıcı kimliğiyle arama. Telefon yalnız özet olarak saklandığı için numarayla arama yok.
  - Ayrıntıda abonelik salt okunur, kotalar, sayılar ve onaylar görünür.
  - Anonimleştirme, uygulamadaki hesap silmeyle aynı işi yapar (`UsersService.anonymize`). Yönetici ve uzman hesapları anonimleştirilemez.
- **Denetim kaydı (`audit_logs`):** her yazma işleminde kimin (o anki e-postasıyla), neyi, hangi kayıtta yaptığı tutulur. Kayıtlar değiştirilmez.
  - İşlemler: `species.create`, `species.update`, `species.draft`, `species.approve`, `report.resolve`, `user.anonymize`.

### Maliyet ve alarm

- **Kayıt (`ai_usage`):** her ücretli sağlayıcı çağrısı (tanıma, teşhis, asistan, kart taslağı) için bir satır, fiyatı çağrı anında hesaplanır.
  - Claude: model başına liste fiyatı (Opus 5.5: girdi 4, çıktı 20 dolar; Sonnet 5.5: 2 ve 10; Haiku 5.5: 0,10 ve 0,50; milyon token başına). Önbellek okuma ve yazma da hesaba katılır; bilinmeyen model en pahalı fiyattan sayılır.
  - Kindwise: çağrı başına `KINDWISE_USD_PER_CALL`, varsayılan 0,055 dolar; kredinin pahalı ucu.
  - Hesap silinince satırlar kalır, kişiyle bağı kopar.
- **Alarm:** `SpendAlarmService` her `SPEND_CHECK_MINUTES` dakikada (varsayılan 30) bugünkü tahmini harcamaya bakar.
  - `DAILY_SPEND_ALERT_USD` (varsayılan 20 dolar) aşılınca `ADMIN_ALERT_EMAIL` adresine bir e-posta gider.
  - Gün başına tek satırlık benzersiz kayıt, birden fazla API örneğinde bile tek e-posta demek.
  - Üretimde `ADMIN_ALERT_EMAIL` zorunlu.

### Haiku 5.5 uyumu (6. haftadan düzeltme)

Claude API notlarına göre Haiku 5.5 iki şeyi kabul etmiyor:
- Sunucu tarafı yedek model (`fallbacks` 400 döndürüyor).
- Konuşma ortası sistem mesajı.

Asistan sürücüsü ikisini de her modele gönderiyordu, bu yüzden Haiku'ya geçiş ya da değerlendirmede Haiku her istekte hata verirdi. Artık:
- Haiku'da `fallbacks` gönderilmiyor.
- Bitki bilgisi kullanıcı mesajının içinde `<bilgi>` etiketiyle gidiyor.
- Opus 5.5 ve Sonnet 5.5 eskisi gibi çalışıyor.

Sürücü yanıtla birlikte token kullanımını da döndürüyor; maliyet kaydı bunu kullanıyor.

## Testler ve doğrulama

**Testler:**
- **API e2e, 9 yeni test:**
  - müşteriye 403;
  - uzman ile yönetici ayrımı;
  - elle eklenen türün uygulamanın aramasında görünmesi;
  - ürün adı içeren kartın reddedilmesi;
  - taslağın onaya kadar gizli kalması;
  - bildirim kuyruğu;
  - anonimleştirme;
  - maliyet özeti;
  - alarmın bir kez gitmesi;
  - her yazma işleminin denetim kaydı.
- **API birim, 3 yeni test:** model özellikleri, bitki bilgisinin yeri, fiyatlar.
- **Panel birim, 3 test:** üretimde çerezin HttpOnly, Secure ve SameSite=Strict olması; token yenileme zamanı; güvenli yönlendirme.

**Tarayıcıda (yerel):**
- Müşteri hesabı reddedildi; yönetici girdi.
- Çerezler sayfa betiğine görünmüyor.
- Ürün adı içeren kart reddedildi; form doldurulmuş hâlde geri geldi.
- Düzeltilen kart kaydedildi ve uygulamanın aramasında çıktı. Onay ve yapay zekâ taslağı çalıştı.
- Denetim kaydı, maliyet ve kullanıcı sayfaları açıldı. Çıkış ve oturumsuz yönlendirme doğru.

**Üretim sunucusunda:** yenilenen çerezlerde `Secure; HttpOnly; SameSite=strict` ve güvenlik başlıkları var.

## Açık kalanlar

- Sahip kendi hesabına `ADMIN`, ziraat mühendisine `STAFF` rolü verecek (veritabanından; panelde rol yönetimi yok).
- Panelin yayın adresi ve barındırması (Railway) sahipte. Üretimde `ADMIN_API_URL` iç ağdaki API'yi göstermeli.
- `ADMIN_ALERT_EMAIL` ve gerçek e-posta sağlayıcısı (SMTP) sahipte.
- Kindwise birim fiyatı kredi paketine göre güncellenmeli.
- Uzman onayı arayüzü var; 24 taslak kartı ve gelecek 300–500 türü ziraat mühendisinin incelemesi gerekiyor.
