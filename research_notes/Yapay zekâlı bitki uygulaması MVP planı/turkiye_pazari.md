# Turkish Market for AI Plant Apps (Identification, Disease Diagnosis, Care): Demand, Competition, Pricing, Legal/Regulatory (as of 25 Oct 2026)

Research notes for a new Turkish-language AI plant app sold as an in-app subscription (no physical products). Store data was pulled live on 2026-10-25 from Apple's public iTunes Search/Lookup API (TR storefront), the TR App Store web pages and Google Play (hl=tr, gl=TR). Nothing here is legal or tax advice; items marked "lawyer/mali müşavir must confirm" need professional review.

Method notes for the report writer:
- iTunes Search API order is Apple's *relevance* ranking for the keyword. It approximates App Store search order but does not reproduce it exactly, and it is not a top-grossing or download chart.
- iTunes `userRatingCount` with `country=tr` is the **Turkish storefront** rating count. Google Play ratings and install counts are **global**.
- "TR UI" below means Turkish appears in the app's declared iOS `languageCodesISO2A` list. A Turkish store title with no Turkish UI suggests localization of the store listing (ASO metadata) only.

## 1. Competition: which plant apps rank in Turkey, which are Turkish-made, and how well global apps are localized

### Takeaway
The TR App Store and Google Play results for "bitki tanıma / bitki bakımı / çiçek tanıma / bitki hastalığı" are led by global subscription apps: PictureThis, PlantIn, Plantum, Plantify, PlantSnap and PlantNet. One strong Turkish-made player, ScaleUp's PlantApp (Urla/İzmir), sits among them, followed by a long tail of small Turkish indie and studio apps that have very few ratings. Agri-tech apps for farmers are a separate segment. Plantix (Android only) and Agrio are the global names there, while the Turkish players (Doktar, Tarım Cebimde, İmeceMobil, Tarlam Cepte) mostly do not offer photo-based consumer diagnosis. Localization is uneven: PictureThis, PlantIn and Plantify ship a Turkish UI; Plantum, Blossom and PlantMe localize only the store title; Planta has no Turkish at all.

### Cited Findings
**TR App Store, query "bitki tanıma" (relevance order; TR rating count and average; TR UI flag)** — [iTunes Search API, TR, "bitki tanıma"](https://itunes.apple.com/search?term=bitki%20tan%C4%B1ma&country=tr&entity=software&limit=25)
1. PlantNet (seller "CTRE COOP INTERNAT RECHERCHE AGRO DEV" = CIRAD; free, no subscription seen in listing): 602 ratings, 4.75, TR UI. [Listing](https://apps.apple.com/tr/app/plantnet/id600547573)
2. PictureThis-Bitki Tanımlayıcı (Glority Global Group): 3,037 ratings, 4.66, TR UI. [Listing](https://apps.apple.com/tr/app/picturethis-bitki-tan%C4%B1mlay%C4%B1c%C4%B1/id1252497129)
3. PlantIn・bitki ve çiçek tanıma (Vortemol Ltd): **9,093 ratings** (the most in the TR storefront), 4.55, TR UI. [Listing](https://apps.apple.com/tr/app/plantin-bitki-ve-%C3%A7i%C3%A7ek-tan%C4%B1ma/id1527399597)
4. Plantify: Bitki Tanıma (Deep Flow Software Services FZCO, Dubai): 764 ratings, 4.55, TR UI. [Listing](https://apps.apple.com/tr/app/plantify-bitki-tan%C4%B1ma/id6474967729)
5. Plantum・Bitki ve Çiçek Tanıma (AIBY): 2,888 ratings, 4.52, **no TR UI**. [Listing](https://apps.apple.com/tr/app/plantum-bitki-ve-%C3%A7i%C3%A7ek-tan%C4%B1ma/id1476047194)
6. Rest of the top 23: PlantSnap (1,340), Blossom (590, no TR UI), PlantMe/ZED UK (931, no TR UI) and Seek by iNaturalist (120), plus many small apps. PlantApp (ScaleUp) is #23 for this query but has **3,839 TR ratings, 4.70**. [Listing](https://apps.apple.com/tr/app/plantapp-bitki-tan%C4%B1mlay%C4%B1c%C4%B1/id1595795215)

**Other queries.** PlantIn ranks #1 for "bitki bakımı"; PictureThis ranks #1 for "bitki hastalığı". The "bitki hastalığı" results also include Bayer's MagicScout (9 ratings) and small Turkish apps such as TatarAI (Hakan Gölge) and AgroBot (Çekirdek Bilgisayar). Sources: [iTunes Search, "bitki bakımı"](https://itunes.apple.com/search?term=bitki%20bak%C4%B1m%C4%B1&country=tr&entity=software&limit=25), [iTunes Search, "bitki hastalığı"](https://itunes.apple.com/search?term=bitki%20hastal%C4%B1%C4%9F%C4%B1&country=tr&entity=software&limit=25), [iTunes Search, "çiçek tanıma"](https://itunes.apple.com/search?term=%C3%A7i%C3%A7ek%20tan%C4%B1ma&country=tr&entity=software&limit=25)

**Turkish-registered sellers in the TR App Store results** (TR rating counts in brackets) — same iTunes Search queries as above:
- ScaleUp Yazılım Hizmetleri A.Ş., PlantApp [3,839]
- Blacke Teknoloji, Plantiary [93]
- Üzümcü Teknoloji, Botanis [116]
- Goldlab Applications, PlantSense [42]
- App Origins Studio [19]
- Marsby Teknoloji, PlantGo [7]
- Greenity Teknoloji A.Ş. [13]
- FIBO Mobile [10]
- Eral Yazılım, FloraLife [0]
- Teknopoint [1]
- Kıcırlar Group, "Tarım Asistanı Ai" [25 ratings, 4.84]
- Individual Turkish developers, e.g. Ömer Sezer "Bitkilerim" [36], Hamza Kavak "Fylora" [50], Burak Öztopuz "PlantWise" [2]

**Google Play TR ("bitki tanıma") order of package IDs:** org.plantnet, com.vadaintl.turkish.plantix, com.myplantin.app, com.codeway.plantapp, cn.danatech.xingseus (PictureThis), …, com.scaleup.plantid, …, com.agrio. [Google Play search](https://play.google.com/store/search?q=bitki%20tan%C4%B1ma&c=apps&hl=tr&gl=TR)

**Google Play detail pages (global figures):**
| App | Installs | Ratings / average | Other |
|---|---|---|---|
| [PictureThis](https://play.google.com/store/apps/details?id=cn.danatech.xingseus&hl=tr&gl=TR) | 50M+ | 806k / 4.45 | Turkish listing description |
| [PlantIn](https://play.google.com/store/apps/details?id=com.myplantin.app&hl=tr&gl=TR) | 10M+ | 136k / 3.93 | |
| [PlantApp (ScaleUp)](https://play.google.com/store/apps/details?id=com.scaleup.plantid&hl=tr&gl=TR) | 10M+ | 549k / 4.23 | Developer address: Gülbahçe Mah., **Urla/İzmir, Türkiye** |
| [Plantify](https://play.google.com/store/apps/details?id=com.codeway.plantapp&hl=tr&gl=TR) | 5M+ | 81k / 4.26 | Package name `com.codeway.*`, now published by "Deep Flow Apps", Dubai Digital Park address |
| [PlantNet](https://play.google.com/store/apps/details?id=org.plantnet&hl=tr&gl=TR) | 10M+ | 265k / 4.59 | |

**Disease-focused apps on Google Play:**
- [Plantix](https://play.google.com/store/apps/details?id=com.peat.GartenBank&hl=tr&gl=TR): 10M+ installs, Turkish listing text ("mobil bir mahsul doktoru", 30 major crops)
- [Agrio](https://play.google.com/store/apps/details?id=com.agrio&hl=tr&gl=TR): 500k+ installs, Turkish description
- [Bitki Hastalık Teşhisi & Bakım (ZAppsolution)](https://play.google.com/store/apps/details?id=com.tomo.ai.plant&hl=tr&gl=TR): 1M+ installs, 3.83

**Small Turkish-language Play apps** — each has few installs:
- ["bitki tanıma türkçe" (irfan yazılım)](https://play.google.com/store/apps/details?id=com.vadaintl.turkish.plantix&hl=tr&gl=TR): 10k+ installs, 2.8 rating
- [Synloria: Bitki Bakım Asistanı](https://play.google.com/store/apps/details?id=com.syntoria.akillisaksi&hl=tr&gl=TR): 1k+
- [Greenity](https://play.google.com/store/apps/details?id=greenity.app&hl=tr&gl=TR): 1k+

**Localization of the global apps** (declared iOS UI languages, TR storefront lookup) — [iTunes Lookup, TR](https://itunes.apple.com/lookup?id=1410126781,1252497129,1527399597,1476047194,1595795215,6474967729,1239193220,1487453649,1532875668&country=tr):
- **Turkish UI:** PictureThis (28 languages incl. TR), PlantIn (incl. TR), Plantify (incl. TR).
- **No Turkish UI:** Planta (12 languages, no TR), Plantum (no TR), Blossom (no TR), PlantMe (no TR), Agrio (EN only). Plantum, Blossom and PlantMe still use Turkish store titles.
- **Conflict:** PlantApp declares only EN on iOS despite its Turkish title and Turkish Play description. The iOS language list may not reflect in-app localization, so verify by installing.
- Planta's TR listing is English ("Planta: Plant & Garden Care") and has only 141 TR ratings. Its listing text even references "local UK weather". [Planta TR listing](https://apps.apple.com/tr/app/planta-plant-garden-care/id1410126781)
- Plantix is not on the TR App Store: searching "plantix" returns an unrelated app by Ajay Gorasiya. [iTunes Search, "plantix"](https://itunes.apple.com/search?term=plantix&country=tr&entity=software&limit=10)

**Turkish agri-tech:**
- Doktar was founded in 2017 and uses IoT, satellite/radar data and AI for field decisions. It raised about 15.7 million TL in 2024 (KAP disclosure) — [Webrazzi, 2024-05-06](https://webrazzi.com/2024/05/06/tarim-teknolojileri-gelistiren-doktar-yaklasik-16-milyon-tl-yatirim-aldi/); [Webrazzi, 2023-10-24](https://webrazzi.com/2023/10/24/doktar-diffusion-capital-partners-liderliginde-yatirim-aldi/)
- Sources disagree on Doktar's footprint: "20+ countries" — [Ekonomi Gazetesi](https://www.ekonomigazetesi.com/sektor-haberleri/tarimin-doktari-20-ulkede-tarlalarin-verimini-artiriyor-23472); another source cited in search results says 36 countries.
- A new "Doktar App" (Doktar Teknoloji A.Ş.) is on the TR App Store with 0 ratings. [iTunes Search, "doktar"](https://itunes.apple.com/search?term=doktar&country=tr&entity=software&limit=10)
- Other farmer apps on the TR App Store:
  - Tarım Cebimde (T.C. Tarım ve Orman Bakanlığı): 754 ratings, 3.01, no TR UI flag
  - İmeceMobil: 1,332 ratings, 4.67
  - Tarlam Cepte (Türk Traktör): 732 ratings
  - Ziraat Çiftçi Platformu: 35 ratings

  Sources: [iTunes Search, "tarım"](https://itunes.apple.com/search?term=tar%C4%B1m&country=tr&entity=software&limit=10); [iTunes Search, "çiftçi"](https://itunes.apple.com/search?term=%C3%A7ift%C3%A7i&country=tr&entity=software&limit=10)
- The Turkish smart-agriculture market was USD 101M in 2023, forecast to reach USD 237M by 2030 (Grand View Research, via Ekonomist). [Ekonomist](https://www.ekonomist.com.tr/makale/akilli-tarim-cagi-basladi-65131)
- Earlier attempt: "Plex" (Mersin Üniversitesi Teknopark, Cadcom Bilgisayar) aimed at photo-based plant disease diagnosis in 2016. Its current status is unknown. [Webrazzi, 2016](https://webrazzi.com/2016/02/25/mersinde-gelistirilen-plex-fotograftan-bitki-hastaliklarini-teshis-edecek/)

### Inferences
- **Competitive gap.** Of the leaders with large TR rating bases, only PictureThis, PlantIn and Plantify offer a Turkish UI. Planta, the strongest care/scheduling brand globally, is effectively absent (English only, 141 ratings). A deeply Turkish care assistant could find room against the identify-first incumbents. "Deeply Turkish" means Turkish common plant names, local climate/seasons, balcony conditions and local nursery species.
- **Turkish teams can win.** ScaleUp (İzmir) shows that a Turkish team can build a top plant ID app (10M+ global installs). Turkish studios mostly build for global markets, though. The Codeway-origin package (Plantify) points the same way, but corporate ownership was not verified.
- **Farmer segment is under-served.** It has no dominant Turkish photo-diagnosis app with a large rating base. Ministry and bank apps focus on registration, subsidies and finance. Plantix, Android-only, is the main global diagnosis tool with a Turkish listing.

### Gaps
- Actual TR top-chart ranks (Education/Lifestyle top-grossing/top-free) and download/revenue estimates were not accessible. They need Sensor Tower, data.ai or AppMagic.
- Google Play IAP prices in TRY were not extractable from static pages.
- Ownership links between Codeway and Deep Flow, and ScaleUp's Turkish revenue share, were not verified.
- Tarla.io could not be found in Turkish tech press or the stores.
- Whether Doktar's new app offers photo-based disease diagnosis is unverified.

## 2. Demand signals (hobby/houseplant/balcony gardening; farmer-side diagnosis demand)

### Takeaway
Hard, current, Turkey-specific houseplant market statistics are scarce. Demand is visible through proxies:
- Five-figure TR App Store rating bases for the leading plant ID apps (PlantIn 9.1k, PlantApp 3.8k, PictureThis 3.0k, Plantum 2.9k)
- Press reports of a post-COVID balcony-gardening boom in which growers cannot meet demand (Nov 2025)
- Municipal hobby-garden lotteries
- 2.3M registered farmers
- Rising AI-app downloads in Turkey

### Cited Findings
- **TR App Store rating counts** (proxy for installed base): PlantIn 9,093; PlantApp 3,839; PictureThis 3,037; Plantum 2,888; PlantSnap 1,340; PlantMe 931; Plantify 764; PlantNet 602; Blossom 590. [iTunes Search API, TR](https://itunes.apple.com/search?term=bitki%20tan%C4%B1ma&country=tr&entity=software&limit=25)
- **Balcony gardening** (AA via Sözcü, 21 Nov 2025). An Üsküdar greenhouse marketing manager reported:
  - Urban balcony-gardening interest is rising.
  - Some plant sales rose more than 100% during COVID.
  - Demand has since shifted from edible plants (peppers, cucumbers) to flowering and foliage plants, with violets (menekşe) leading.
  - Growers have moved from two production runs per season to three or four because they "cannot meet demand".
  - Online sales and social-media how-to videos are credited with driving demand.

  [Sözcü](https://www.sozcu.com.tr/balkonlarda-son-5-yilin-en-buyuk-degisimi-uretici-talebe-yetisemiyor-p261144)
- **Sector size** (Minister Yumaklı, May 2026): Türkiye produces about 2 billion ornamental plants per year, earning about USD 140M, with about 100k direct and 500k indirect jobs. Yalova produces about half of Türkiye's orchids. [Alomaliye, 2026-05-09](https://www.alomaliye.com/2026/05/09/turkiye-yilda-2-milyar-adet-sus-bitkisi-uretiyor/)
- **Older signal (2021, dated):** The ornamental plant exporters' association chair reported rising consumer demand for live plants, with artificial flowers losing ground. [Para Dergi, 2021-12-30](https://paradergi.com.tr/sektorler/2021/12/30/yapay-cicek-out-canli-cicek-in)
- **"Plant parenting" (bitki ebeveynliği)** was described as a TikTok/Gen-Z trend accelerated by the pandemic (2020, dated). [Milliyet](https://www.milliyet.com.tr/cumartesi/z-kusaginin-ebeveynlik-deneyimi-6314522)
- **Municipal hobby gardens (hobi bahçesi)** are allocated by notarized lottery when applicants exceed plots. Examples from search results:
  - Aksaray 2026: 456 winners — [Milli Gazete](https://www.milligazete.com.tr/aksaray-hobi-bahcesi-isim-listesi-2026-kimler-kazandi-parsel-numaralari-ne-evraklar-nereye-teslim-edilecek)
  - Şanlıurfa Büyükşehir: 157 plots, deadline 31 Jan 2025 — [Urfanatik](https://www.urfanatik.com/sanliurfada-buyuk-firsat-kiralamak-isteyenler-icin-detaylar)
  - Ekonomist reports continued interest in hobby gardens — [Ekonomist](https://www.ekonomist.com.tr/haberler/hobi-bahcelerine-ilgi-suruyor-en-cok-talep-uc-ilden-iste-fiyatlar-25021)

  Applicant totals were not given.
- **AI-app adoption in Turkey** (Sensor Tower via DonanımHaber): AI mobile app downloads in Turkey rose from 11.3M (2023) to 27.4M (2024), +142.5%. [DonanımHaber](https://www.donanimhaber.com/turkiye-de-ai-uygulamalarini-indirme-sayisi-yuzde-142-artti--196554)
- **Global context** (Sensor Tower 2025): non-game in-app spend was USD 85.6B, and generative-AI app IAP revenue more than tripled to over USD 5B. [CNBC-e](https://www.cnbce.com/teknoloji/mobilde-ezber-bozuldu-2025te-para-oyundan-degil-yapay-zekadan-akti-h23626)
- **Farmers:**
  - ÇKS-registered farmers numbered 2.1M (2001), 2.2M (2023) and 2.3M (2024), per Ministry data cited in press. This figure came from a search snippet and the full article was not read. [Ekonomi Gazetesi](https://www.ekonomigazetesi.com/sehirler/cksde-destekler-artirilsin-ve-odemeler-zamaninda-yapilsin-2-25416)
  - Internet use among skilled agriculture workers rose from 38.6% (2017) to 71% (2022) and 86% (latest year, not clearly dated). [Uzmanpara/Milliyet](https://uzmanpara.milliyet.com.tr/uzmanpara/ciftcilerin-internet-kullanimi-iki-katini-asti-7637486)
  - Farmers mainly use mobile internet on smartphones and reach Ministry apps such as TarımCebimde by phone. [IKV note](https://www.ikv.org.tr/images/files/ikv_bilgi_notu_eurostat_aras%CC%A7t%C4%B1rmas%C4%B1_c%CC%A7iftc%CC%A7ilerin_internet_eris%CC%A7imi_stajyer%20emiralp.pdf)
- **Mandatory digital records.** From 1 July 2026 nationwide, after pilot provinces, farmers' plant-protection purchases and applications must be recorded electronically per crop and parcel (B-Reçete). This pushes farmers toward digital tools. [Tarım ve Orman Bakanlığı, 2025-12-13](https://www.tarimorman.gov.tr/Haber/6890/B-Recete-Takip-Sistemini-Iceren-Bitki-Koruma-Urunlerinin-Uygulanmasi-Ve-Denetimine-Dair-Yonetmelik-Yayimlandi)

### Inferences
- **Consumers:** The hobby segment is real and growing, centered on urban balcony gardening with flowering, foliage and succulent plants. TR rating counts suggest a Turkish installed base in the hundreds of thousands across the top apps. This is a rough proxy only: rating-to-install ratios are commonly 1–2%, which is a general industry heuristic and not a sourced Turkey figure.
- **Farmers:** Demand for disease diagnosis plausibly exists (2.3M registered farmers, high mobile internet use). Monetizing via consumer subscription is a different motion, though. Section 6 also limits what can be recommended, since pesticides are prescription-only.

### Gaps
- Google Trends could not be queried (the Trends API returned HTTP 429). There is no time series for "bitki tanıma", "ev bitkisi", "bitki bakımı" or "saksı çiçeği".
- No Turkish e-commerce category growth data for live plants (Trendyol, Hepsiburada, Çiçeksepeti) was found. The ETİD/Ticaret Bakanlığı e-commerce reports give only aggregates.
- No sizes of Turkish houseplant Facebook groups, Instagram accounts or Reddit communities were found.
- No national survey of smartphone use by farmers specifically was found.

## 3. Pricing in Turkey (TRY prices of competitors, store tiers, willingness to pay, payment habits)

### Takeaway
Competitors in the TR App Store charge in TRY with wide A/B-tested ranges:
- Annual plans run roughly ₺200–₺2,000, clustering around ₺800–₺1,500 for the leaders.
- Weekly plans run ₺100–₺800.
- Lifetime offers run ₺150–₺2,500 (one outlier at ₺14,999.99).

Against a 2026 net minimum wage of ₺28,075.50/month, a ₺799.99 annual plan is about 2.8% of one month's minimum wage. Weekly plans annualize to very high figures and draw Turkish user complaints. Apple adjusted TR prices and proceeds for tax/FX in Nov 2025 and Jan 2026, but **auto-renewable subscriptions were excluded**, so subscription prices in TRY must be managed manually. Payments run through store billing: cards, carrier billing (Paycell, Türk Telekom, Vodafone on Apple) and gift-card balance.

### Cited Findings
**TR App Store IAP lists as displayed on 2026-10-25** (top 10 IAP items per app; labels as shown):

| App | Plan | TRY price |
|---|---|---|
| PictureThis ([page](https://apps.apple.com/tr/app/picturethis-bitki-tan%C4%B1mlay%C4%B1c%C4%B1/id1252497129)) | "PictureThis Pro" | ₺799.99 (most items), ₺299.99, ₺149.99 |
| | Family Plan | ₺1,999.99 |
| PlantIn ([page](https://apps.apple.com/tr/app/plantin-bitki-ve-%C3%A7i%C3%A7ek-tan%C4%B1ma/id1527399597)) | Weekly | ₺349.99, ₺299.99, ₺229.99, ₺129.99 |
| | Yearly | ₺1,299.99, ₺899.99 |
| | Lifetime | ₺2,499.99 (special offer ₺999.99) |
| | Season Pass | ₺999.99 |
| | "Monthly Premium" | ₺5,999.00 |
| Plantum ([page](https://apps.apple.com/tr/app/plantum-bitki-ve-%C3%A7i%C3%A7ek-tan%C4%B1ma/id1476047194)) | Various | ₺20.99 to ₺2,499.99 |
| | Premium 1 month | ₺122.99 |
| | Plantum PRO | ₺649.99 |
| PlantApp, ScaleUp ([page](https://apps.apple.com/tr/app/plantapp-bitki-tan%C4%B1mlay%C4%B1c%C4%B1/id1595795215)) | 1 week | ₺159.99, ₺229.99, ₺449.99, ₺799.99 |
| | 1 month | ₺189.99 |
| | 1 year | ₺419.99, ₺579.99 |
| | Yearly "PLAT" | ₺1,499.99 |
| | Lifetime | ₺1,299.99, ₺2,499.99 |
| Planta ([page](https://apps.apple.com/tr/app/planta-plant-garden-care/id1410126781)) | 12 months | ₺214.99, ₺259.99, ₺339.99, ₺699.99, ₺999.99 |
| | 1 month | ₺47.99, ₺299.99 |
| | 3 months | ₺107.99 |
| Plantify ([page](https://apps.apple.com/tr/app/plantify-bitki-tan%C4%B1ma/id6474967729)) | "Plantify Premium" items | ₺229.99 to ₺2,499.99, plus one at ₺14,999.99 |
| PlantSnap ([page](https://apps.apple.com/tr/app/plantsnap-bitki-tan%C4%B1ma/id1451054346)) | Weekly | ₺99.99 |
| | Monthly | ₺89.99 |
| | Yearly | ₺119.99 to ₺2,299.99 |
| | Lifetime | ₺149.99 to ₺299.99 |
| Blossom ([page](https://apps.apple.com/tr/app/blossom-bitki-tan%C4%B1ma/id1487453649)) | 1 year | ₺1,499.99, ₺1,999.99 |
| | 1 month | ₺199.99 |
| | Weekly with free trial | ₺149.99, ₺299.99 |
| PlantMe ([page](https://apps.apple.com/tr/app/plantme-bitki-ve-%C3%A7i%C3%A7ek-tan%C4%B1ma/id1532875668)) | Weekly | ₺66.99, ₺124.99, ₺164.99 |
| | 1 year | ₺204.99 |
| | Max listed | ₺719.99 |
| Plantiary, Turkish seller Blacke Teknoloji ([page](https://apps.apple.com/tr/app/bitki-tan%C4%B1ma-plantiary/id1596971856)) | Weekly | ₺179.99, ₺249.99, ₺499.99 |
| | Other items | ₺99.99 to ₺999.99 |

**User complaints about weekly plans:**
- A TR review on PlantIn says the app charges weekly ("HAFTADA 200 TL KESİYOR") until cancelled, with the user losing about 4,000 TL. [PlantIn TR page](https://apps.apple.com/tr/app/plantin-bitki-ve-%C3%A7i%C3%A7ek-tan%C4%B1ma/id1527399597)
- A PlantMe review calls a free trial converting to a 70 TL/week subscription a scam and asks for one-time payment. [PlantMe TR page](https://apps.apple.com/tr/app/plantme-bitki-ve-%C3%A7i%C3%A7ek-tan%C4%B1ma/id1532875668)

**Income benchmark:** The 2026 net minimum wage is ₺28,075.50/month (gross ₺33,030), effective 1 Jan 2026, after a 27% increase over 2025's ₺22,104.67. [EY Türkiye](https://www.ey.com/tr_tr/insights/tax/2026-asgari-ucret); [KPMG Vergi](https://kpmgvergi.com/yayinlar/mali-bultenler/sosyal-guvenlik/2026-yili-asgari-ucreti-aciklandi/3342)

**Apple TR price changes:**
- **17 Nov 2025:** Apple raised TR App Store prices for apps and IAPs due to FX and tax changes, covering 40+ currencies. Auto-renewable subscriptions were **excluded**. [Teknoblog, 2025-10-31](https://www.teknoblog.com/app-store-turkiye-fiyatlarina-zam-yolda/)
- **29 Jan 2026:** Apple adjusted proceeds for the "Türkiye: Digital sales tax (DST) rate decrease from 7.5% to 5%". Auto-renewable subscriptions and manually set prices kept their current prices. [9to5Mac, 2026-01-29](https://9to5mac.com/2026/01/29/apple-revises-app-store-pricing-and-payouts-in-select-countries-following-new-tax-rules/); [CNBC-e, 2026-01-30](https://www.cnbce.com/teknoloji/apple-app-store-gelirlerinde-turkiye-icin-vergi-guncellemesine-gitti-h24067). CNBC-e expects the change to reduce tax deductions from developer proceeds.
- **Earlier Apple TR notice (likely Dec 2021):** TR prices increased; proceeds are calculated on the tax-exclusive price; Apple collects and remits applicable taxes (Paid Applications Agreement, Exhibit B). [Apple Developer News](https://developer.apple.com/news/?id=xymmt0iz)

**Google Play:**
- Türkiye is a location where Google is merchant of record and remits VAT. Türkiye supports tax-inclusive pricing, so buyer-facing prices must include all taxes. [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- Google's last published TRY minimum price was ₺0.59 (2015), down from ₺2.00. This is outdated. [Android Developers Blog, 2015](https://android-developers.googleblog.com/2015/11/minimum-purchase-price-for-apps-and-in.html)

**Payment methods:**
- Apple Account in Türkiye accepts most credit/debit cards, Apple Account balance (gift cards / add funds), and mobile phone billing via Paycell, Türk Telekom Mobil Ödeme and Vodafone Mobil Ödeme. [Apple Support](https://support.apple.com/en-us/111741)
- Google Play has historically supported carrier billing in Turkey (Turkcell Mobil Ödeme, Avea). This source is old and undated. [Teknoblog](https://www.teknoblog.com/apple-app-store-satin-almalari-icin-operator-uzerinden-odeme-secenegi-sunuyor/)

### Inferences
- **Price anchors:** Price-sensitive Turkish users likely anchor on PictureThis at ₺799.99/yr and Planta's ₺214.99–₺999.99 annual tiers. A Turkish newcomer could position annual pricing around ₺400–₺900 with a monthly option of about ₺100–₺200. Weekly plans at ₺150–₺350 annualize to ₺7.8k–₺18k (28–65% of a month's net minimum wage). They carry reputational risk and, given Section 4, regulatory complaint risk.
- **Lifetime/one-off demand:** Some reviewers explicitly ask for one-time payment, and several competitors sell lifetime IAPs at ₺150–₺2,500. A lifetime SKU or a credit pack (per diagnosis) is worth testing.
- **Inflation management:** Apple's automatic TRY equalization skips auto-renewable subscriptions, so under Turkish inflation the developer must schedule periodic manual TRY price increases. Apple's and Google's subscription price-increase consent flows apply; their exact rules were not researched here.
- **Store billing fits local habits:** It covers cards, operator billing and gift cards, and removes the need for a Turkish payment gateway for in-app digital goods.

### Gaps
- Apple's current full TRY price-point table (lowest tier, step sizes) for 2026 was not retrieved. App Store Connect is authoritative.
- Google Play TRY price ranges and minimums for 2026 were not retrieved.
- No Turkey-specific subscription willingness-to-pay or conversion data (Sensor Tower/RevenueCat country benchmarks) was found.
- No USD/TRY rate for Oct 2026 was sourced, so no USD conversions are given.

## 4. Consumer law and tax for a Turkish company selling digital subscriptions via Apple/Google

### Takeaway
**Consumer law:**
- The Mesafeli Sözleşmeler Yönetmeliği exempts "elektronik ortamda anında ifa edilen hizmetler" and services started with consumer consent from the 14-day cayma hakkı (Art. 15(1)(ğ),(h)).
- TKHK (6502) Art. 52 still governs subscriptions: cancellation no harder than sign-up, termination effective 7 days after notice, and renewal notice reported by a secondary source.
- The Ticaret Bakanlığı announced in Oct 2026 that it is **working on updating subscription rules**, citing auto-renewal complaints. No new text has been published yet.

**Tax:**
- The DST rate is 5% for 2026 and 2.5% from 2027. It is borne by large platforms such as Apple, not a small developer.
- Apple and Google act as merchant of record and collect TR VAT (20%) from consumers.
- A Jan 2026 GİB özelge says a Turkish app developer cannot claim the hizmet ihracı VAT exemption or the KVK 10/1-ğ deduction for revenue from users in Türkiye. Invoicing mechanics still need a mali müşavir.

### Cited Findings
**Cayma hakkı exceptions** (Mesafeli Sözleşmeler Yönetmeliği, RG 27.11.2014 No. 29188). Art. 15(1) begins "Taraflarca aksi kararlaştırılmadıkça…" and lists:
- (ğ) "Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmeler"
- (h) "Cayma hakkı süresi sona ermeden önce, tüketicinin onayı ile ifasına başlanan hizmetlere ilişkin sözleşmeler"

For services, the withdrawal period starts on the day the contract is concluded (Art. 9(2)). For subscription contracts, pre-contract information must show total costs per billing period (Art. 5(4)). Source: [Alomaliye, regulation text](https://alomaliye.com/2014/11/27/mesafeli-sozlesmeler-yonetmeligi/)

**2025 amendment:** RG 24.05.2025 No. 32909, effective 1 Jan 2026. It changed pre-information on withdrawal (Art. 5(1)(g), (k)) and intermediary (aracı hizmet sağlayıcı) return-carrier duties (Art. 12(5)). It repealed Art. 13(3) and Art. 15(1)(ı). (ğ) and (h) were not reported as changed. [Erdem & Erdem](https://www.erdem-erdem.av.tr/bilgi-bankasi/mesafeli-sozlesmeler-yonetmeliginde-degisiklik-yapilmasina-dair-yonetmelik); [Alomaliye, 2025-05-24](https://www.alomaliye.com/2025/05/24/mesafeli-sozlesmeler-yonetmeliginde-degisiklik-24-05-2025/)

**TKHK Art. 52 subscriptions** (law-firm summary dated 2026-05-04) — [Bilal Alyar](https://bilalalyar.av.tr/?p=101463):
- Covers continuous/periodic supply, including "dijital içerik abonelikleri" (streaming, games, cloud).
- Art. 52/4: "Aboneliğin sona erdirilmesi, abonelik sözleşmesinin kurulmasını sağlayan yöntemden daha ağır koşullara bağlanamaz."
- Art. 52/2: indefinite-term contracts, or fixed-term contracts longer than one year, may be terminated at any time without penalty.
- Art. 52/3: the contract ends 7 days after the notice reaches the provider.
- Auto-renewing contracts require notice "yenileme tarihinden makul bir süre önce" on a durable medium. This is the firm's reading; check the Abonelik Sözleşmeleri Yönetmeliği text.
- Violations are fined under Art. 77.

Another firm also says cancellation must be as easy as sign-up and lists digital/membership services in scope. That page is undated. [Hukukçular Evi](https://hukukcularevi.com/otomatik-yenilenen-abonelik-6502-bilgilendirme-iptal/)

**Ticaret Bakanlığı reform signal** (Ekonomi Gazetesi, 20 Oct 2026) — [Ekonomi Gazetesi](https://www.ekonomigazetesi.com/ekonomi/dijital-abonelikte-mevzuat-yenileniyor-90062):
- Minister Ömer Bolat, answering a TBMM question: "abonelik sözleşmelerine ilişkin mevzuatın ihtiyaçlara göre güncellenmesine yönelik çalışmalara başlanmış olup".
- 1,459 digital-subscription consumer applications in 2025–2026.
- 282 automatic-renewal complaints in 2023–2026.
- In 2022 one provider was fined ₺5,946,435 for renewing 9,669 consumers' annual/seasonal subscriptions without request or approval.
- No draft text or timeline has been published.

Corroboration: [Dünya](https://www.dunya.com/ekonomi/dijital-aboneliklerde-onaysiz-yenileme-mercek-altinda-bakanlik-inceleme-baslatti-haberi-844536)

**Digital Service Tax (Law 7194):**
- Presidential Decision No. 10767 (RG 25 Dec 2025) cut the rate from 7.5% to **5% from 1 Jan 2026** and **2.5% from 1 Jan 2027**. [Alomaliye, 2025-12-25](https://www.alomaliye.com/2025/12/25/dijital-hizmet-vergisi-orani-dusuruldu-2026-yilinda-yuzde-5-2027-yilinda-yuzde-2-5/); [BloombergHT](https://www.bloomberght.com/dijital-hizmet-vergisi-2026-dan-itibaren-yuzde-5-oraninda-uygulanacak-3764708)
- DST applies to providers above €750M worldwide **and** TRY 20M Turkish revenue thresholds, per the 2019 bill summary. Thresholds may have changed since. [Mondaq, 2019](https://www.mondaq.com/Article/863604)
- A bill amending Law 7194's scope was introduced on 20 Oct 2025; its outcome was not verified. [Digital Policy Alert](https://digitalpolicyalert.org/event/34855-bill-amending-law-no-7194-on-digital-service-tax-and-amending-certain-laws-and-decree-law-no-375-was-introduced-in-grand-national-assembly)

**VAT:**
- The general TR VAT rate is 20% since 10 Jul 2023 (Presidential Decision 7346, RG 07.07.2023 No. 32241). [Alomaliye](https://www.alomaliye.com/2023/07/07/katma-deger-vergisi-oranlari-karar-sayisi-7346/)
- Apple collects and remits taxes in Türkiye. [Apple Developer News](https://developer.apple.com/news/?id=xymmt0iz)
- Google is merchant of record and remits Türkiye VAT. [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)

**GİB özelge on App Store / Google Play revenue** (İstanbul VDB, 30.01.2026, No. 62030549-125-143061; published by Alomaliye 18.02.2026). It concerned a company selling AI and game apps with IAPs and subscriptions on both stores:
- The VAT export-of-services exemption (KDVK 11/1-a) applies only where the customer is abroad and benefits abroad. For use in Türkiye, the general VAT rules apply.
- KVK 10/1-ğ (export-of-services earnings deduction) and the KVK 32/7 five-point reduced rate do **not** apply when the app is also used domestically.
- Invoices must be issued within 7 days of the service (VUK 231/5).
- The özelge did **not** rule on whether one collective invoice can cover many customers. It referred that question to the Ministry under VUK mükerrer 257.

[Alomaliye, 2026-02-18](https://www.alomaliye.com/2026/02/18/app-store-ve-google-playden-elde-edilen-gelirler-nasil-vergilendirilir/); [PwC Türkiye özelge bulletin 2026-2](https://www.pwc.com.tr/tr/Hizmetlerimiz/vergi/vergi-bultenleri/2026/yeni-gelir-idaresi-ozelgeleri-2026-2.pdf)

**Possibly outdated:** Paraşüt (2022) describes the GVK 20/C framework for individual mobile app developers with a 15% withholding and an ₺880,000 ceiling. These figures are likely revalued since. [Paraşüt](https://www.parasut.com/blog/mobil-uygulama-satislarinin-vergilendirilmesi)

### Inferences
- **Consumer obligations sit mostly with the stores, not entirely.** With Apple/Google as merchant of record, purchase, cancellation and refund flows run through the store. Store cancellation is generally in device settings and is "no harder than sign-up". The developer remains the service provider, however, and should not assume all 6502 duties fall on Apple/Google. Lawyer must confirm who is "satıcı/sağlayıcı" for app-store subscriptions under Turkish law.
- **Practical safeguards:**
  - Clear Turkish pre-purchase disclosure of price per billing period, renewal and free-trial conversion
  - An in-app "how to cancel" link
  - Avoiding aggressive weekly trial-to-paid flows (the regulator is currently investigating auto-renewal complaints)
  - Records of consent for immediate performance, to rely on Art. 15(1)(ğ)/(h)
- **Tax:**
  - DST is a platform-level tax that Apple bears and partly passes through via proceeds.
  - A small Turkish developer is far below the €750M / TRY 20M thresholds, so it is not itself a DST taxpayer. Confirm with a mali müşavir.
  - Domestic revenue likely does not qualify for export incentives. The 30.01.2026 özelge suggests that even foreign-user revenue in a mixed-use app may not get KVK 10/1-ğ.
  - Many Turkish developers invoice Apple/Google's foreign entities for proceeds. Whether that counts as export of services, or as a domestic consumer supply, is exactly the unresolved question. A mali müşavir must confirm the invoicing (e-fatura/e-arşiv) setup.

### Gaps
- The primary text of the Abonelik Sözleşmeleri Yönetmeliği was not retrieved. This leaves unconfirmed:
  - its exact scope wording (whether "dijital içerik" is listed)
  - any renewal-notice day count
  - its price-increase rules
- No published draft of the 2026 subscription reform was found.
- No official GİB guidance on whether a Turkish developer's payouts from Apple Distribution International / Google Commerce Ltd count as export of services when the end users are in Türkiye. The özelge treats end users as the customers, which is a fact-specific reading.
- The Apple TR DST pass-through mechanics (exact proceeds formula) were not verified from Apple's own 2026 post.

## 5. KVKK (photos, location, cross-border transfer to AI APIs, legal basis, children, retention) and İYS

### Takeaway
User plant photos can be personal data. Photos may contain faces, home interiors and EXIF GPS, and location is personal data in its own right. Since the 2024 amendment (Law 7499; Regulation of 10 Jul 2024), sending every photo to a US/EU AI API is a **regular cross-border transfer**. Such transfers need an adequacy decision (none published), or appropriate safeguards — in practice the **KVKK standard contract**, signed with the provider and **notified to KVKK within 5 business days**. Explicit consent is only an exception for occasional (arızi) transfers. KVKK's Nov 2025 generative-AI guide reinforces purpose limitation and AI-interaction transparency. Fines are revalued yearly; the 2026 ranges are higher by 25.49%. Commercial SMS/e-mail need İYS-registered consent. Whether push notifications fall under İYS is unresolved in the sources.

### Cited Findings
**Cross-border transfer rules:**
- The Regulation "Kişisel Verilerin Yurt Dışına Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik" was published 10 Jul 2024. [Webrazzi, 2024-07-10](https://webrazzi.com/2024/07/10/kvkk-dan-yeni-yonetmelik-kisisel-veriler-yurt-disina-aktarilabilecek/)
- Transfer routes in order:
  1. Adequacy decision (country, sector or international organization), reviewed at least every 4 years
  2. Appropriate safeguards: BCRs, standard contracts, or written undertaking with Board permission
  3. Exceptional cases only if no safeguard is possible: explicit consent, contract necessity, rights, vital interests, etc.

  Same source.
- KVKK announced that standard contracts must be notified "imzaların tamamlanmasından itibaren beş iş günü içinde", physically, by KEP or via the Standart Sözleşme Bildirim Modülü. Each party's signature date must appear in the contract. The standard text must not be altered except optional or alternative clauses. [KVKK announcement](https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu)
- The notification module was launched by Board decision 2024/1793 (17.10.2024). [Erdem & Erdem](https://www.erdem-erdem.av.tr/bilgi-bankasi/standart-sozlesme-bildirim-modulu-hakkinda-kamuoyu-duyurusu)
- Four standard-contract modules exist (C2C, C2P, P2C, P2P). Guidance of 2 Jan 2025 allows dual-language versions. Ordinary e-signatures may not suffice. [Mondaq](https://www.mondaq.com/turkey/data-protection/1661592/bulletin-on-2025-administrative-fines-under-the-turkish-personal-data-protection-law-and-guidelines-on-the-transfer-of-personal-data-abroad)
- Explicit consent is an exception and "not suitable for transfers that continue over time". [Bilal Alyar, 2026-05](https://bilalalyar.av.tr/kvkk-uluslararasi-veri-aktarimi/)
- **No adequacy list published:** Türkiye has not yet published a list of adequate countries or sectors, so transfers rely on safeguards. This EY document is undated. [EY Türkiye](https://ey.com/content/dam/ey-unified-site/ey-com/tr-tr/services/law/documents/ey-tr-kisisel-verilerin-korunmasi.pdf); see also [Erdem & Erdem (Amazon decision)](https://www.erdem-erdem.av.tr/bilgi-bankasi/kisisel-verilerin-korunmasi-kurulunun-amazon-karari-isiginda-kisisel-verilerin-yurt-disina-aktarilmasi)
- **Provider willingness:** Customers are asking cloud vendors to sign the Turkish standard contract (e.g., a Railway feedback thread). No vendor commitment was found for OpenAI, Google, Anthropic, AWS or Microsoft. [Railway Station thread](https://station.railway.com/feedback/turkish-kvkk-standard-contract-cross-bo-332347a8)

**KVKK "Üretken Yapay Zekâ ve Kişisel Verilerin Korunması Rehberi (15 Soruda)"** (Yayın No. 113, Nov 2025, non-binding) — [İmer summary](https://imer.av.tr/kvkk-araclari/uretken-yapay-zeka-kisisel-veri-rehberi); [Alomaliye, 2025-11-24](https://www.alomaliye.com/2025/11/24/sorularla-uretken-yapay-zeka-ve-kisisel-verilerin-korunmasi-rehberi/):
- Each phase (training, operation, outputs, development) needs its own Art. 5/6 basis. Explicit consent is not needed if another basis applies.
- Contract performance covers only processing necessary to deliver the service.
- Vague purposes like "model geliştirmek" should be avoided.
- Users must be told when they interact with AI ("Kullanıcı bir ÜYZ ile … etkileşimde olduğunu açıkça bilmelidir").
- Foreign AI providers trigger Art. 9 in the order adequacy → Art. 9/4 safeguards → Art. 9/6 exceptions (occasional only).
- Retention should be limited to purpose.
- Art. 11 rights apply across training data, outputs and user queries.
- The guide gives guidance for parents on children's use, but no age threshold.

KVKK also published "Yapay Zekâ Alanında Kişisel Verilerin Korunmasına Dair Tavsiyeler" (April 2025 per Cottgroup). [Cottgroup](https://www.cottgroup.com/tr/blog/kvkk-gdpr/item/yapay-zeka-alaninda-kisisel-verilerin-korunmasina-dair-tavsiyeler)

**2026 KVKK fines** (revaluation rate 25.49%) — [Cottgroup](https://cottgroup.com/tr/mevzuat/item/yeniden-degerleme-oranina-gore-2026-yili-kvkk-idari-para-cezalari):
| Breach | 2026 fine range |
|---|---|
| Aydınlatma (notice) | ₺85,437–₺1,709,200 |
| Veri güvenliği (data security) | ₺256,357–₺17,092,242 |
| VERBİS | ₺341,809–₺17,092,242 |
| Breach of Board decisions | ₺427,263–₺17,092,242 |
| Standard-contract notification failure | ₺90,308–₺1,806,377 |

**İYS (6563 + Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik):**
- Consents obtained outside İYS must be uploaded to İYS within 3 business days; unregistered consents are invalid. [Karar](https://www.karar.com/ticari-mesajlara-yeni-duzenleme-1434260); [Hukuki Haber](https://www.hukukihaber.net/ticari-elektronik-ileti-gonderimine-iliskin-ileti-yonetim-sistemi-iys-sureleri-ertelendi)
- Consent cannot be requested inside a commercial message itself. [Cottgroup](https://cottgroup.com/tr/mevzuat/item/ileti-yonetim-sistemi-ve-yeni-uygulamalar)
- Covered vehicles are listed as telefon, çağrı merkezi, faks, otomatik arama, akıllı ses kaydedici, e-posta and SMS "gibi" (illustrative list). Push notifications are not named. [Mıhçı Hukuk](https://mihci.av.tr/ticari-elektronik-iletiler/)
- Turkish push vendor Netmera says "Tüm ticari elektronik iletilerin (e-posta, SMS vb.) göndericileri, İYS'ye kaydolmak zorundadır" but does not address push. [Netmera](https://netmera.com/iys/)

### Inferences
- **Legal bases:**
  - **Photo upload for identification/diagnosis:** contract performance (Art. 5/2-c) is the natural basis.
  - **Reusing photos to train or improve models:** needs a separate, specific basis. The guide warns against vague purposes. Use explicit consent via an opt-in toggle, or a documented legitimate-interest balancing test.
  - **Precise location** (weather-based care, regional disease alerts): optional and opt-in. Coarse city or region is preferable.
  - **EXIF GPS:** strip it from uploads unless needed.
- **AI vendor transfers:** For every AI vendor (e.g., OpenAI, Google Gemini, Anthropic, Plant.id/Kindwise, PlantNet API):
  1. Determine roles (usually controller → processor)
  2. Sign the KVKK C2P standard contract
  3. Notify KVKK within 5 business days

  Explicit consent cannot legitimize continuous API transfers. If a vendor will not sign, options are an EU/TR-hosted model, on-device inference, or a vendor that signs. Lawyer must confirm feasibility; this is a material MVP architecture constraint.
- **Children:** Turkish law sets no specific digital age of consent in KVKK, so minors' consent relies on legal-guardian rules. Positioning the app 13+/adult and avoiding child-directed marketing reduces risk. Lawyer must confirm.
- **Marketing channels:** E-mail/SMS marketing requires İYS registration and consent upload within 3 business days. For push, the conservative approach is OS-level opt-in plus a separate in-app marketing consent. Treat push as possibly covered by 6563 until a lawyer confirms. Transactional reminders (watering) are likely not "ticari elektronik ileti", but this is an inference.

### Gaps
- No official KVKK or Ticaret Bakanlığı statement on whether push or in-app notifications are "ticari elektronik ileti" or must be recorded in İYS was found.
- VERBİS registration exemption thresholds (employee count / balance sheet) for 2026 were not verified.
- No confirmation of which major AI/cloud providers sign the KVKK standard contract.
- The official adequacy-decision status as of Oct 2026 is not confirmed from kvkk.gov.tr.
- The KVKK Board's position on retention periods for user images was not found.

## 6. Turkish rules on plant-health advice and plant protection product (pesticide) recommendations

### Takeaway
Two regulations dated 13 Dec 2025 (RG No. 33106) tightened plant-protection product (bitki koruma ürünü, BKÜ) rules after the fatal pesticide poisoning of the Böcek family in Istanbul.
- **Prescriptions:** licensed BKÜ are prescription-only. Prescriptions can be written only by Ministry-authorized agricultural engineers who graduated in plant protection and are T.C. citizens.
- **Internet ban:** "internet üzerinden ve sosyal iletişim araçları ile tanıtımı ve satışı yapılamaz" (Art. 7(1) of the wholesale/retail regulation). This general ban on online promotion and sale of BKÜ covers ads, videos and images. Only license holders may present label information on their own websites.
- **Off-label use:** use must follow Ministry-approved recommendations.

An AI app should therefore not recommend or promote specific branded pesticides, dosages or off-label uses, and should not link to their sale. Limit output to diagnosis, cultural/non-chemical measures, and "consult an authorized ziraat mühendisi / get a reçete". Lawyer must confirm how "tanıtım" applies to an AI's informational output.

### Cited Findings
- **Bitki Koruma Ürünlerinin Uygulanması ve Denetimine Dair Yönetmelik** (RG 13.12.2025 No. 33106):
  - Repeals the 2014 "Bitki Koruma Ürünlerinin Önerilmesi, Uygulanması ve Kayıt İşlemleri Hakkında Yönetmelik".
  - Introduces the B-Reçete Takip Sistemi (electronic purchase/application/harvest records per crop and parcel).
  - Allows drone application under Ministry conditions and pre-harvest pesticide inspection.
  - Applies in pilot provinces 30 days after publication and in other provinces from **1 July 2026**.
  - Prescription provisions now sit in the wholesale/retail regulation.

  [Tarım ve Orman Bakanlığı, 2025-12-13](https://www.tarimorman.gov.tr/Haber/6890/B-Recete-Takip-Sistemini-Iceren-Bitki-Koruma-Urunlerinin-Uygulanmasi-Ve-Denetimine-Dair-Yonetmelik-Yayimlandi)
- **Same regulation, article level:**
  - Art. 11(1): reçeteli products cannot be applied "reçete yazma yetkisine sahip kişi tarafından düzenlenmiş bitki koruma ürünü reçetesi olmadan".
  - Art. 24(3)(a) sanctions "tavsiye dışı bitki koruma ürünü kullanımı".
  - Art. 29 (yürürlük): 30 days after publication.
  - Geçici Md. 2: not applied in non-pilot provinces until 1/7/2026.

  [Alomaliye, regulation text](https://www.alomaliye.com/2025/12/13/bitki-koruma-urunlerinin-uygulanmasi-ve-denetimine-iliskin-yonetmelik/)
- **Bitki Koruma Ürünlerinin Toptan ve Perakende Satılması ile Depolanması Hakkında Yönetmelik** (RG 13.12.2025) — [Alomaliye, regulation text](https://www.alomaliye.com/2025/12/13/bitki-koruma-urunlerinin-toptan-ve-perakende-satilmasi-ile-depolanmasi/):
  - **Art. 7(1):** a general prohibition with no named addressee. It reads "internet üzerinden ve sosyal iletişim araçları ile tanıtımı ve satışı yapılamaz", including ads and video/image posting.
  - Art. 7(2): license holders and their dealers, wholesalers, producers and distributors may not open sales websites.
  - Art. 7(3): "Bakanlıkça tavsiye veya onayı bulunmayan ürünler, bitki koruma ürünü gibi tanıtılamaz ve satılamaz".
  - Art. 7(5): only license holders may promote licensed products on their own websites, using approved label information only.
  - **Art. 16:** only Ministry-authorized, T.C.-citizen ziraat mühendisleri who graduated from a plant-protection department may write prescriptions. Without a "Bitki Koruma Ürünü Reçete Yazma Yetki Belgesi", no prescriptions.
  - Art. 21(1)(c): dealers may not advise beyond Ministry technical instructions, prescription and label ("…doz ve uygulama esasları dışında tavsiye edemez").
  - Art. 23(1)(b): users must use products per "Bakanlıkça onaylı tavsiyelerine".
  - Art. 24(1)(g): license holders may not steer users to off-label uses.
  - Sanctions include administrative fines, suspension and permit cancellation, with criminal complaints for counterfeit or banned products. Physical-condition compliance runs until 31/12/2028. This comes from the page summary; the full penalty article was not read.
- **Press coverage:** reçete requirement, online/social promotion and sales ban, ban on discount campaigns and on video/image sharing, sales authorization certificate with an exam, and regional sales restrictions. [Takvim, 2025-12-14](https://www.takvim.com.tr/guncel/2025/12/14/bocek-ilaci-faciasi-sonrasi-kritik-duzenleme-resmi-gazetede-yayimlandi); [CNBC-e, 2025-12-13](https://www.cnbce.com/haberler/bitki-koruma-urunlerinin-satisinda-elektronik-b-recete-takip-sistemi-zorunlu-oldu-h21186)
- CNBC-e reports a ₺5,000 fine for dealers selling prescription products without a prescription or without records. This amount may be outdated or revalued. [CNBC-e](https://www.cnbce.com/haberler/bitki-koruma-urunlerinin-satisinda-elektronik-b-recete-takip-sistemi-zorunlu-oldu-h21186)
- **Framework law:** 5996 sayılı Veteriner Hizmetleri, Bitki Sağlığı, Gıda ve Yem Kanunu. The pre-harvest inspection action plan is based on it. [Tarım ve Orman Bakanlığı](https://www.tarimorman.gov.tr/Haber/6890/B-Recete-Takip-Sistemini-Iceren-Bitki-Koruma-Urunlerinin-Uygulanmasi-Ve-Denetimine-Dair-Yonetmelik-Yayimlandi)
- **Competitor practice:** PlantApp's listing carries a disclaimer that photo-based assessments "do not confirm a diagnosis" and advises consulting "a qualified plant care professional". PictureThis and Plantum, by contrast, market "treatment advice" and a "step-by-step treatment plan". [PlantApp TR page](https://apps.apple.com/tr/app/plantapp-bitki-tan%C4%B1mlay%C4%B1c%C4%B1/id1595795215); [PictureThis TR page](https://apps.apple.com/tr/app/picturethis-bitki-tan%C4%B1mlay%C4%B1c%C4%B1/id1252497129)

### Inferences
- **Safe output design for an AI diagnosis feature in Turkey:**
  - Identify the likely problem with a confidence level.
  - Recommend cultural and mechanical measures: watering, light, pruning, isolation, sanitation, soap/water wipes. Integrated pest management concepts are fine.
  - Optionally mention the general active-ingredient class.
  - Avoid branded BKÜ names, dosages, application timing and links to purchase. Any of these could be read as internet "tanıtım" or off-label advice.
  - For farm crops, route users to an authorized ziraat mühendisi / reçete and the B-Reçete process.
  - Add a clear disclaimer, as PlantApp does.
- **Farmer product implications:** A farmer-facing product that wants to recommend chemicals would need a prescription workflow with authorized engineers (human-in-the-loop). That is a regulated, B2B-like model, not a pure consumer subscription.
- **Houseplants vs. crops:** Houseplant users mostly buy small consumer pesticide or biocide products. Whether these are licensed BKÜ (prescription-only) or "ev ve bahçe" products under other regimes (e.g., biocides under the Sağlık Bakanlığı) affects what may be named. Not researched; lawyer must confirm.

### Gaps
- The full text of the penalty articles and the exact 2026 fine amounts in both 13.12.2025 regulations were not read (page truncated).
- No guidance or case law yet on whether AI-generated informational content naming licensed BKÜ counts as "tanıtım" under Art. 7(1).
- The status of biocides and home-garden products (Biyosidal Ürünler Yönetmeliği, Sağlık Bakanlığı) was not researched.
- Whether which BKÜ classes are reçeteli (Ministry-designated active ingredients) affects houseplant products was not verified.
- No rules were found on fertilizer recommendations (gübre), which fall under a separate regime.
