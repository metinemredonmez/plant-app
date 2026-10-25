# KVKK: yurt dışı sağlayıcılar

Planın 6. hafta kapısı: sözleşmesi olmayan bir sağlayıcıyla kişisel veri işleyen özellik yayına çıkmaz. Yurt dışına düzenli aktarımın yolu Kurul'un standart sözleşmesi. Sözleşme değiştirilmeden imzalanır ve imzalardan sonraki 5 iş günü içinde KVKK'ya bildirilir (ayrıntı ve kaynaklar MVP planının KVKK bölümünde). İmzalamayan sağlayıcı için ya imzalayan bir alternatif ya da avukatın yazılı görüşüne dayanan bir çözüm gerekiyor.

Sunucu bu kuralı kendisi uyguluyor (`apps/api/src/config/env.ts`). Üretimde aşağıdaki "kapı adı" `KVKK_TRANSFER_APPROVED` listesinde yoksa o sağlayıcının sürücüsüyle sunucu açılmaz. Listeye yalnız sözleşme imzalanıp bildirildikten sonra ekleyin.

Durum sütunu sahibin işi. Bölge ve şirket bilgileri sözleşme sırasında teyit edilmeli.

| Sağlayıcı | Ne için | Giden veri | Kapı adı | Durum |
|---|---|---|---|---|
| Kindwise (plant.id, plant.health) | Tanıma ve teşhis | Tarama fotoğrafı (EXIF silinmiş); kullanıcı kimliği gitmez | `kindwise` | Sözleşme bekliyor |
| Anthropic (Claude API) | Bakım asistanı | Soru, sohbet geçmişi, bitki bilgisi, şehir ve onboarding cevapları (deneyim, evcil hayvan) | `anthropic` | Sözleşme bekliyor |
| Cloudflare R2 | Tarama fotoğraflarının saklanması | Tarama fotoğrafı | `cloudflare` | Sözleşme bekliyor; kova bölgesi seçilmeli |
| Railway | API sunucusu | Bütün istekler | sunucu tarafından denetlenemez | Sözleşme bekliyor; bölge seçilmeli |
| Neon | Veritabanı | Bütün kayıtlar | sunucu tarafından denetlenemez | Sözleşme bekliyor; bölge seçilmeli |
| RevenueCat | Abonelik | Uygulama kullanıcı kimliği (`publicId`), satın alma kayıtları | uygulamadan gider (7. hafta) | Sözleşme bekliyor |
| Sentry | Hata kayıtları | Kişisel veri temizlenmiş hata ayrıntıları | henüz kurulmadı | Sözleşme bekliyor; bölge seçilmeli |
| Expo push | Sunucudan bildirim (10. hafta) | Bildirim jetonu ve içeriği | henüz kullanılmıyor | Sözleşme bekliyor |
| E-posta sağlayıcısı (SMTP) | Doğrulama ve şifre sıfırlama | E-posta adresi | sağlayıcı seçilmedi | Seçim bekliyor |
| Apple ve Google ile giriş | Hesap açma ve giriş | Apple'a hesap silmede erişim iptali için yenileme jetonu gider | — | Avukata sorulmalı |

Aktarım sayılmayanlar:
- **Netgsm**: SMS kodları; sağlayıcı Türkiye'de.
- **Open-Meteo** (hava): sunucu yalnız il adını ve il merkezinin koordinatlarını gönderir. Kullanıcıyla ilişkilendirilebilecek bir veri gitmez. Ticari kullanım için ücretli plan gerekiyor (`WEATHER_API_KEY`).
