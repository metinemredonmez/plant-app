# ADR 0014: Asistan bağlamı, yanıt bildirme ve model seçimi

- Durum: Kabul edildi (planın 6. haftası, öne çekildi); model seçimi sahipte
- Tarih: 26 Ekim 2026
- İlgili: [ADR 0009](0009-yapay-zekali-bakim-uygulamasi.md), [ADR 0013](0013-teshis-guvenligi-ve-iyilesme-takibi.md), [KVKK sağlayıcı listesi](../kvkk-saglayicilar.md)

## Bağlam

Planın 6. haftası asistanı tamamlıyor:
- Bağlam kurucu: bitki profili, son bakım olayları, son teşhis ve takip, şehrin hava özeti.
- İstem önbelleği, kota, çıktı moderasyonu.
- Her yanıtta "Bu yanıtı bildir" ve yapay zekâ etiketi.
- 50 soruluk Türkçe değerlendirmeyle model seçimi.
- KVKK sağlayıcı kapısı.

Sohbet, sunucu vekili, istem önbelleği ve kota 1. haftada kurulmuştu.

Kabul kriterleri:
- Seçilen model değerlendirmede en az %85 "doğru ve güvenli" alıyor.
- Yanıtlar bitkinin adını, yerini ve son sulamasını kullanıyor.
- Kota aşılınca paywall'a yönlendiriliyor.
- Uygulama paketinde yapay zekâ anahtarı yok.
- Her yabancı sağlayıcı için sözleşme ya da yazılı alternatif kararı var.

## Karar

### Bağlam kurucu

Her soruda sunucu Postgres'teki yapılandırılmış veriden bir bağlam kurar; modelin hafızasına dayanılmaz.
- **Bitki:** takma ad, tür, yer, ışık, saksı, sulama aralığı, son sulama, son beş bakım kaydı ve bakım kartının özeti.
- **Son teşhis:** varsa ikinci fotoğrafın sonucu kullanılır. Takip varsa "fotoğrafa göre daha iyi, sahibine göre aynı" gibi bir satır eklenir.
- **Kullanıcı:** şehri, şehrin hava özeti ve onboarding cevapları (deneyim, evcil hayvan).

Bitkisiz sohbetler de şehri, havayı ve onboarding cevaplarını alır. Bağlam "Kullanıcı bilgisi" başlığıyla gider. Hiçbiri yoksa bağlam gönderilmez.

Bağlam, sorunun ardından konuşma ortası bir sistem mesajı olarak gider. Böylece sabit sistem istemi ve geçmiş önbellekte kalır.

### Şehir havası

`WeatherProvider` sürücüsü (`apps/api/src/weather/`). Seçenekler:
- `none`: varsayılan; sağlayıcı ve lisans seçilene kadar.
- `fake`: testler için.
- `open-meteo`.

Open-Meteo sürücüsü:
- İl merkezini adıyla bir kez bulur; 3 günlük tahmini il başına bir saat önbelleğe alır.
- 3 saniyede yanıt alamazsa hava satırı eklenmez; asistan yine yanıt verir.
- Sağlayıcıya yalnız il adı ve koordinat gider, kişisel veri gitmez.
- Özet satırında don (2 °C ve altı) ve aşırı sıcak (35 °C ve üstü) uyarısı var. Türe göre eşikler 10. haftadaki hava uyarılarıyla gelecek.
- 81 ilden İzmir, Erzurum, Kocaeli ve Hatay canlı API'yle denendi. Ücretsiz uç ticari kullanıma kapalı; ticari plan `WEATHER_API_KEY` ile kullanılıyor.

### Model

- Varsayılan model değişmedi (`claude-opus-5-5`). Plan Haiku sınıfı bir varsayılan öneriyor, ama geçiş sahibin kararı ve değerlendirmeye bağlı.
- **Değerlendirme seti:** `apps/api/test/fixtures/assistant-eval.ts`, 50 Türkçe soru, sekiz konu: sulama, ışık ve yer, belirtiler, zararlılar, zehirlilik, mevsim ve hava, toprak ve saksı, genel. Yirmi ikisinde bitki ve kullanıcı bağlamı var; bunlar yanıtların bitkinin adını, yerini ve son sulamasını kullanıp kullanmadığını da ölçüyor.
- **Çalıştırma:** `pnpm assistant:eval run [model …]` her soruyu her aday modele sorar ve kullanıcının göreceği (süzülmüş) yanıtı kör bir tabloya yazar. Modeller harflerle gizlenir; tablo Türkçe Excel'de açılır. Ham yanıttaki kural ihlali, adın kullanılması ve süre ayrı bir anahtar dosyasına yazılır.
- **Puanlama:** bir ana dil konuşanı ve bir ziraat mühendisi her yanıtı "doğru" ve "güvenli" (0/1) ve Türkçe (1–5) diye puanlar. `pnpm assistant:eval score <klasör>` model başına "doğru ve güvenli" oranını hesaplar; eşik %85.
- **Kapsam:** sunucuda yalnız Claude sürücüsü var. Plandaki OpenAI ve Gemini adayları ayrı sürücü ve ayrı KVKK sözleşmesi istiyor; sahip isterse eklenir.

### Kota

Plan aşımda 429 diyor. ADR 0009'daki karar korundu: 402 ve `code: quota_exceeded`. Uygulama bu yanıtla "Premium planlar" düğmeli uyarıyı açıyor. Bu davranış Jest ve e2e testleriyle kilitli.

### Çıktı moderasyonu

Üç katman var:
1. Sistem istemi.
2. ADR 0013'teki bitki koruma süzgeci: yanıt gösterilmeden ve kaydedilmeden önce uygulanır.
3. Modelin reddettiği isteklerde sabit, kibar bir yanıt.

Kullanıcı da her yanıtı bildirebilir.

### "Bu yanıtı bildir" ve yapay zekâ etiketi

- `POST /v1/assistant/messages/:id/report`, gerekçeyle: yanlış bilgi, güvensiz öneri, konu dışı ya da başka. İsteğe bağlı not en çok 500 karakter.
- Yalnız kişinin kendi asistan yanıtları bildirilebilir. Yeni bildirim eskisinin yerine geçer.
- Kayıt mesajın üstünde durur ve hesapla birlikte silinir. 8. haftadaki admin kuyruğu bunları okuyacak.
- Uygulamada her asistan yanıtının altında "Yapay zekâ yanıtı · Bildir" yazıyor; bildirilen yanıtta "Bildirildi, teşekkürler". Sohbetin altındaki "Asistan hata yapabilir" notu duruyor.

### KVKK sağlayıcı kapısı

`KVKK_TRANSFER_APPROVED`: standart sözleşmesi imzalanıp bildirilmiş sağlayıcıların listesi. Üretimde listede olmayan sağlayıcının sürücüsüyle sunucu açılmaz. Sürücüler ve kapı adları:
- `VISION_DRIVER=kindwise` → `kindwise`
- `ASSISTANT_DRIVER=anthropic` → `anthropic`
- `STORAGE_DRIVER=r2` → `cloudflare`

Geliştirme ortamı etkilenmez. Sunucunun denetleyemediği sağlayıcılar (Railway, Neon, RevenueCat, Sentry, Expo push) [listede](../kvkk-saglayicilar.md) elle izleniyor.

### Uygulamada anahtar yok

- `apps/app/test/no-ai-keys.test.ts` kaynakta yapay zekâ anahtarı, anahtar adı ya da sağlayıcı adresi arar. Paketlenen `EXPO_PUBLIC_` adlarını bilinen herkese açık adlarla sınırlar.
- `npm run check:bundle-keys` iOS ve Android paketini gerçekten dışa aktarıp tarar. 26 Ekim'de 2 paket ve 56 dosyada iz çıkmadı.

## Açık kalanlar (sahipte)

- **Model seçimi:** `ANTHROPIC_API_KEY` sunucuya girilince değerlendirme çalıştırılır (3 model × 50 soru). Yanıtları bir ana dil konuşanı ve bir ziraat mühendisi puanlar; sonuca göre `ASSISTANT_MODEL` seçilir.
- **Standart sözleşmeler:** Kindwise, Anthropic ve Cloudflare için imza ve bildirim. Railway, Neon, Sentry ve RevenueCat için bölge seçimi ve sözleşme.
- **Hava sağlayıcısı:** Open-Meteo'nun ticari planı ya da başka bir sağlayıcı; lisans kararı.
- **Sohbet notları:** sohbetten çıkan, kullanıcının görüp silebileceği kısa notlar planda var ama bu haftanın teslimatında yok. Asistan hafızasını silme 9. haftada.
