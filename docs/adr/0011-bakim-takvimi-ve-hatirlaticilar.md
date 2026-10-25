# ADR 0011: Bakım takvimi, yerleşim ve günlük hatırlatıcı

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026
- Kaynak: [reports/Yapay zekâlı bitki uygulaması MVP planı.md](../../reports/Yapay%20zekâl%C4%B1%20bitki%20uygulamas%C4%B1%20MVP%20plan%C4%B1.md), 4. hafta ve hatırlatıcı bölümü

## Karar

### Bitkinin yeri

- Bitkiye üç bilgi eklendi:
  - Konum tipi (iç mekân, balkon, bahçe)
  - Işık (az, orta, parlak dolaylı, doğrudan güneş; isteğe bağlı)
  - Saksı (plastik, pişmiş toprak, sırlı seramik, kendinden sulamalı; isteğe bağlı)
- Şehir bitkide değil kullanıcıda tutuluyor (81 ilden biri, isteğe bağlı) ve 10. haftanın hava uyarıları için. Konum izni istenmiyor.
- Sunucu, yerleşimi bakım kartıyla karşılaştırıp öneri veriyor ([my-plants.service.ts](../../apps/api/src/care/my-plants.service.ts), `placementTips`):
  - ışık türün istediğinden azsa
  - türe doğrudan güneş uygun değilse
  - bulunduğu yer kartın önerdiği yerlerden değilse
  - dışarıdaysa gece sıcaklığı uyarısı
  - kendinden sulamalı saksının haznesi
- Asistanın bitki bağlamına ışık ve saksı da ekleniyor.

### Sulama aralığı mevsimle değişiyor

- Bakım kartı olan ve kullanıcının kendi aralığını vermediği bitkide aralık her gün yeniden hesaplanıyor. Önceden ekleme anında sabitleniyordu.
  - Temel değer kartın yaz (Nisan–Eylül) ya da kış değeri.
  - Yazın dışarıdaki saksı: ×0,75.
  - Pişmiş toprak: ×0,8. Kendinden sulamalı: ×1,5.
- Kullanıcı aralığı kendisi verirse o aralık kalıcı oluyor (`watering_interval_custom`); `null` göndermek otomatiğe döndürüyor.
- Çarpanlar hava verisine kadar sezgisel; 10. haftada gözden geçirilecek.

### Hatırlatıcı: sunucu takvimi, cihazda yerel bildirim

- `GET /v1/my/schedule?days=14` önümüzdeki günlerin sulamalarını İstanbul günlerine göre döndürüyor. Geciken bitki bugüne yazılıyor; sonraki tarihler zamanında sulanacağı varsayımıyla hesaplanıyor.
- Uygulama her açılışta, öne geldiğinde ve her bakım değişikliğinde takvimi çekip yerel bildirimleri yeniden kuruyor ([reminders.ts](../../apps/app/lib/reminders.ts); `apps/app` yerel depoda).
  - Bitki başına değil, **günde tek bildirim**: "Bugün 3 bitkin su istiyor: Monstera, Sardunya ve Fesleğen."
  - Bildirimin kimliği o günün tarihi (`watering-2026-10-30`), böylece yeniden kurmak kopya üretmiyor.
  - En fazla 14 gün. Bekleyen istek sayısı, iOS'un 64 sınırının altında, 50 ile sınırlı; teşhis takibi hatırlatmaları da bu sayıya dahil.
- Saat kullanıcının ayarı (`reminder_minute`, varsayılan 09:00).
- Android:
  - Bildirim kanalı ("Bakım hatırlatmaları") izin isteğinden önce açılıyor; Android 13+ izin penceresi ancak kanal varken çıkıyor.
  - Tam zamanlı alarm izni (`USE_EXACT_ALARM`, `SCHEDULE_EXACT_ALARM`) beyan edilmiyor; sulama dakika hassasiyeti istemiyor.
  - Yeniden başlatmadan sonra bildirimler expo-notifications'ın `BOOT_COMPLETED` alıcısıyla geri kuruluyor; uygulama ilk açılışta da yeniden kuruyor.
- İzin:
  - İlk bitki eklendikten sonra kısa bir açıklamayla, en fazla bir kez isteniyor. Açılıştan önce istenmiyor.
  - Reddedilirse uygulama çalışmaya devam ediyor (Apple 4.5.4): Bitkilerim'de "Bugün su bekleyenler" listesi ve "Hepsini suladım" var. Ekranda "Bildirimler kapalı" notu ve izin ya da ayarlar bağlantısı çıkıyor.
- Çıkış yapılınca bekleyen bildirimler siliniyor; kilit ekranında başka hesabın bitki adları kalmıyor.
- Sunucudan push yok. Hava uyarıları (10. hafta) sunucu push'u olacak.

## Açık kalanlar

- 10 bitkili hesapla "günde tek bildirim" ve Android'de yeniden başlatma, cihazda uçtan uca denenmedi.
  - Takvim mantığı e2e testinde var; iOS simülatöründe bildirim izni ve sıradaki hatırlatma doğrulandı.
  - Android emülatörü bu turda dışarıdan kapandı.
- "Suladım" bildirim üzerindeki bir düğmeyle yapılamıyor; bildirime dokunmak Bitkilerim'i açıyor.
