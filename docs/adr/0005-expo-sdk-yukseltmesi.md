# ADR 0005: Expo SDK 50'den güncel SDK'ya yükseltme

- Durum: **Ertelendi** (25 Ekim 2026, sahibinin kararı: "şimdilik bırak, plana göre devam"). En geç 11. haftada bitmeli: 12. haftadaki TestFlight ve Play kapalı test yüklemeleri de aynı SDK kurallarına tabi.
- Tarih: 25 Ekim 2026

## Bağlam

Rapor, Expo 50'nin bugünkü mağaza kurallarına uyup uymadığını açık soru olarak bırakmıştı. 1. hafta denemesi cevabı verdi: **uymuyor.** Uygulama bu haliyle iki mağazaya da gönderilemez.

| Kontrol | Sonuç |
|---|---|
| Google Play hedef API | 31 Ağustos 2026'dan beri yeni uygulama ve güncellemeler **API 36** (Android 16) hedeflemek zorunda; uzatma en geç 1 Kasım 2026 ([Android Developers](https://developer.android.com/google/play/requirements/target-sdk), [Play Console Yardım](https://support.google.com/googleplay/android-developer/answer/11926878)). Expo 50 / RN 0.73 **API 34** hedefliyor (`node_modules/expo/android/build.gradle`). |
| App Store derleme araçları | 28 Nisan 2026'dan beri yüklemeler **Xcode 26 + iOS 26 SDK** ile derlenmek zorunda ([Apple](https://developer.apple.com/news/upcoming-requirements/)). |
| Yerel iOS build (Xcode 27.0) | İlk deneme 70'ten fazla hedefte "deployment target 13.4, desteklenen aralık 15.0–27.0" hatasıyla **başarısız**. Komut satırından `IPHONEOS_DEPLOYMENT_TARGET=15.1` verilince **başarılı**; uygulama simülatörde açılıp mock sunucuyla çalıştı. |
| Güncel Expo | SDK 56 (22 Mayıs 2026): React Native 0.85, React 19.2, Android API 36, Xcode 26.4+, en düşük iOS 16.4 ([Expo blog](https://expo.dev/blog/upgrading-to-sdk-56)). |

Komut satırı geçici çözümü geliştirme için yeterli. Ama bu bir mağaza build'i değil: Android hedefi 34'te kalıyor ve RN 0.73'ün Xcode 26/27 ile üretim derlemesi doğrulanmış değil.

## Öneri

Expo SDK 56'ya yükseltme, **2. haftaya, frontend'deki güvenlik değişikliklerinden (3. hafta) önce** alınmalı. Aksi halde aynı ekranlar iki kez değiştirilir.

Bilinen işler:

- 50 → 56 altı ana sürüm atlıyor. Expo'nun önerdiği yol, her ara SDK'da `npx expo install --fix` çalıştırıp derlemek.
- RN 0.82 ile New Architecture zorunlu hale geldi. Şablonun native bağımlılıklarından bazıları ya bakımsız ya da yeni mimariyle uyumsuz, yerlerine Expo modülleri geçmeli:
  - `react-native-fast-image` → `expo-image`
  - `react-native-orientation-locker` → `expo-screen-orientation`
  - `@react-native-clipboard/clipboard` → `expo-clipboard` (zaten bağımlılıklar arasında)
- `ios/` klasörü elle yönetilmek yerine Continuous Native Generation'a (`expo prebuild`) geçirilmeli. Böylece SDK yükseltmeleri native projeyi kendisi günceller.
- API 36 büyük ekranlarda yön kilidini yok sayıyor; şablon `Orientation.lockToPortrait()` kullanıyor, tablet görünümü kontrol edilmeli.

Tahmini maliyet: 4–7 iş günü. Takvimde 2. haftaya eklenince sonraki işler yaklaşık bir hafta kayar, ya da 15–16. haftalardaki tamponun ilk haftası kullanılır (raporun risk tablosundaki "tamponun ilk kullanıcısı" maddesi).

## Karar bekleyen soru

Yükseltme 2. haftaya mı alınsın, yoksa pilot öncesine (11–12. hafta) mı bırakılsın? Bu kayıt geç yükseltmeyi önermiyor, çünkü 3–10. haftalarda yapılacak frontend değişiklikleri eski SDK üzerinde yapılmış olur ve yükseltme sırasında yeniden test edilmesi gerekir.
