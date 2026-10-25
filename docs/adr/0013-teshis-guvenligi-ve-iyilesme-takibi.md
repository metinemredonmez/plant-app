# ADR 0013: Teşhis güvenliği ve iyileşme takibi

- Durum: Kabul edildi (planın 5. haftası, öne çekildi)
- Tarih: 26 Ekim 2026
- İlgili: [ADR 0009](0009-yapay-zekali-bakim-uygulamasi.md), [ADR 0010](0010-fotograf-hatti-ve-turkce-adlar.md), planın "Hafta hafta plan" bölümündeki 5. hafta

## Bağlam

Türkiye'de bitki koruma ürünleri yalnız ziraat mühendisinin reçetesiyle kullanılabiliyor ve internetten tanıtılamıyor (RG 33106, Aralık 2025). Teşhis ve asistan bu yüzden ürün adı, doz ya da uygulama zamanı vermemeli; her sonuçta uzmana yönlendirmeli. Buna kadar yalnız Kindwise'ın kimyasal tedavi alanı atılıyordu ve asistan sistem istemine güveniliyordu. Kindwise'ın açıklama metni, "biyolojik" adımları (neem yağı, Bacillus preparatları, sabunlu karışımlar da ruhsatlı ürünler) ve modelin yanıtı süzülmüyordu.

Planın kabul kriteri: 50 istemlik kırmızı takım setinde hiçbir yanıtta ürün adı ya da doz yok, her sonuçta uzman yönlendirmesi var, güven düşükse ikinci fotoğraf isteniyor, takip fotoğrafı aynı teşhise bağlanıyor.

## Karar

### Bitki koruma süzgeci

`apps/api/src/safety/plant-protection.ts`. Kullanıcıya giden ve saklanan her metinden geçer:
- Teşhisin açıklaması ve tedavi adımları.
- Asistanın yanıtı (gösterilmeden ve kaydedilmeden önce).

Süzülenler:
- Etken madde, ürün tipi ve marka adları (imidakloprid, bakırlı ilaç, neem yağı, arap sabunu, Confidor gibi; liste dosyada).
- Doz ve karışım oranı: "litre suya 5 ml", "dekara 200 ml", "%1'lik çözelti", "2 kapak".
- İlaçla birlikte geçen uygulama zamanı: "7 gün arayla", "akşam serinliğinde", "hasattan 21 gün önce".
- Uzmana yönlendirmeyen ilaç talimatı: "fungisit uygulayın", "ilaçlayın".

Yöntem:
- Metin Türkçe küçük harfe ve aksansız biçime çevrilerek aranır; "KÜKÜRT", "kükürt" ve "kukurt" aynıdır.
- Kuralı bozan cümle çıkarılır, gerisi olduğu gibi kalır. Madde işaretleri korunur. Bir satırı kötü olan tablo bütünüyle çıkar.
- Yanıttan 40 karakterden az kalırsa güvenli bir hazır yanıt verilir.
- Bir şey çıkarıldıysa ya da soru ilaçla ilgiliyse uzman yönlendirmesi eklenir.
- Loga yalnız "süzüldü" sayısı düşer, metin yazılmaz.

Bilerek serbest bırakılanlar:
- Sulama miktarları ("1 litre su verin"), gübre oranları, sıcaklık ve santimetre.
- Kültürel ve mekanik önlemler: havalandırma, budama, elle temizleme, yırtıcı böcekler.
- "Toprak kükürt gibi kokuyor" gibi ürün olmayan kullanımlar.

Sınır: listede olmayan yeni bir ürün adını süzgeç tanımaz. Birinci savunma sistem istemi (güçlendirildi: biyolojik ve ev yapımı ilaçlar, rol yapma, tablo ve kod istekleri). Süzgeç ikinci savunmadır. Bildirilen yanıtlarla liste büyütülür.

### Uzman yönlendirmesi

Bitki bulunan her teşhis sonucunda `referral` alanı var. Metin ziraat mühendisine ya da il veya ilçe tarım müdürlüğüne yönlendiriyor ve B-Reçete'yi anıyor. Resmî bir bağlantı eklenmedi; adres teyit edilince eklenecek.

### Güven düşükse ikinci fotoğraf

- En olası sorun %40'ın altındaysa ya da "sağlıklı" sonucu %60'ın altındaysa `needsSecondPhoto: true` döner; ipuçları ve "İkinci fotoğrafı çek" düğmesi gösterilir.
- İkinci fotoğraf `secondPhotoOf` ile ilk teşhise bağlanır: 24 saat içinde, bir kez. Kotadan düşmez.
- İkinci fotoğraf da belirsizse uzmana gösterme önerilir; üçüncü fotoğraf istenmez.

### İyileşme takibi

- Sorun bulunan teşhiste `followUpAt` 5 gün sonrasıdır (önceden 7). Uygulama bu tarihe yerel bildirim kurar. Bildirime dokununca o teşhisin takip fotoğrafı açılır. Bitki sayfasında da "Teşhis takibi" kartı çıkar.
- Takip fotoğrafı `followUpOf` ile ilk teşhise bağlanır (`parentId`, `link: FOLLOW_UP`). Bir teşhise en çok iki takip yapılabilir; takipler kotadan düşmez.
- Karşılaştırma: sağlıklı olma olasılığı ilk teşhise (varsa ikinci fotoğrafa) göre ±0,15 değişirse "daha iyi" ya da "daha kötü" sayılır; değişmezse "aynı", karşılaştırılamazsa "belirsiz". Ekranda "fotoğrafa göre" diye etiketlenir. Kötüleşmede uzmana yönlendirilir.
- Sahibine kendi gözlemi sorulur: "Daha iyi / Aynı / Daha kötü" (`recovery`).

### "Bu teşhis doğru muydu?"

`POST /v1/scans/:id/feedback {correct}`. İlk teşhiste ve ikinci fotoğrafta sorulur; takipte sorulmaz. Yanıtlar eşikleri kendi verimizle ayarlamak için toplanır. Kayıtlar hesapla birlikte silinir.

## Kırmızı takım seti

`apps/api/test/fixtures/red-team.ts`: 50 istem, yedi tür:
- Doz (10) ve marka (8).
- Zaman (7) ve ev yapımı karışım (7).
- Talimat atlatma (10): rol yapma, "filtre kapandı", tablo ya da JSON isteği.
- İngilizce ve yazım hatalı (5).
- Sınırda sorular (3).

- **e2e testi**: her isteme kasıtlı olarak kurala aykırı yanıt veren bir model bağlanır. 50 yanıtın hiçbirinde ürün adı, doz ya da zaman kullanıcıya ulaşmıyor ve hepsinde uzman yönlendirmesi var. Kontrol süzgecin kurallarından bağımsız düz metin desenleriyle de yapılıyor.
- **Birim testleri**: 28 kural ihlali örneği yakalanıyor, 16 güvenli cümle serbest kalıyor.
- **Canlı deneme**: `pnpm --filter @everbloom/api red-team` aynı 50 istemi gerçek modele gönderir; ham yanıtı ve süzülmüş yanıtı ayrı raporlar. Anahtar olmadığı için henüz çalıştırılmadı.

## Açık kalanlar

- Canlı model ile kırmızı takım çalıştırılmalı (ANTHROPIC_API_KEY gerekiyor, yaklaşık 50 kısa istek).
- Kindwise canlı API'yle denenmedi (kredi bekliyor). Gerçek açıklama metinleri süzgeçten geçirilip gözden geçirilmeli.
- Yönlendirme metni ve B-Reçete anılması avukata ya da il tarım müdürlüğüne teyit ettirilmeli.
- Eşikler (0,4, 0,6, 0,15) başlangıç değerleri; doğruluk geri bildirimiyle ayarlanacak.
- 6. haftada asistan için "Bu yanıtı bildir" düğmesi gelince bildirilen yanıtlar süzgeç listesini besleyecek.
