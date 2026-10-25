# Türkiye: operational and legal requirements for a live-houseplant e-commerce app (MVP backend checklist)

Research date: 2026-10-25. This is informational research, not legal or tax advice. Items marked **[lawyer]** or **[mali müşavir]** should be confirmed with a professional. Sources are labelled (primary) for official legal texts and government or provider pages, and (secondary) for blogs, vendor marketing and news. Many provider prices are not published. Where a figure comes from a third-party page, it is flagged.

---

## 1. Payments: which gateways a Turkish merchant can use, their costs and features, Node.js SDKs, and the best MVP choice

### Takeaway
Stripe still does not onboard Turkish merchants: Türkiye is absent from Stripe's official country list as of 2026-10-25. The practical options are local payment institutions. iyzico is the most practical for an MVP: its official Node SDK `iyzipay` is actively published, the sandbox is public, and there are no setup or monthly fees. PayTR is the main alternative and has a richer feature list (card storage, recurring payments, links, taksit query), but it has no official npm package. Craftgate (orchestration) only makes sense later, once you hold several POS agreements. Published commission rates are inconsistent and mostly come from third parties. Expect roughly 2.5–4% plus a small fixed fee for single-shot payments, more for taksit, and get a written offer.

### Cited Findings
**Stripe**
- Stripe's official global availability page lists ~50 countries (e.g., UAE, UK, US, EU states, India/Indonesia in "Preview"). **Türkiye/Turkey does not appear anywhere on the page** (fetched 2026-10-25) — [Stripe Global (primary)](https://stripe.com/global)
- Contradiction: Zunapro's guides claim "Stripe Turkey (official start 2024)" — [Zunapro PL (secondary, vendor marketing)](https://www.zunapro.com/turkey/pl/blog/systemy-platnosci-ecommerce-turcja-raty-iyzico), [Zunapro DE](https://www.zunapro.com/turkey/de/blog/zahlungssysteme-e-commerce-tuerkei-2026-paytr-iyzico). Stripe's own page contradicts this, so treat the claim as unreliable.
- Third-party guides say Turkish founders use a foreign (US/UK) entity to get a Stripe account, i.e. Stripe is not officially supported for Turkish entities — [Dodo Payments, Feb 2025 (secondary)](https://dodopayments.com/blogs/merchant-of-record-turkey), [Osome (secondary)](https://osome.com/uk/blog/stripe-account-turkey-guide)

**iyzico**
- Commission figures differ by source and date: "from 2.49% + 0.25 TL" and "from 2.79% + 0.25 TL" (two Ticimax posts) — [Ticimax (secondary)](https://www.ticimax.com/blog/iyzico-komisyon-oranlari), [Ticimax](https://www.ticimax.com/blog/iyzico-sanal-pos-basvurusu-nasil-yapilir)
- A 2026 comparison gives iyzico single-shot at 2.99–4.29%, 3 taksit at 3.50–4.80% and 6 taksit at 4.50–6.00%, with no monthly fee and payouts in 7–21 days — [Kobitime 2026 (secondary)](https://kobitime.com/sanal-pos-ucretleri-ve-sanal-pos-firmalari-2026/)
- Merchant-specific commission and taksit rates are set in the iyzico panel ("taksit ve komisyon yönetimi") — [IdeaSoft help (secondary)](https://www.ideasoft.com.tr/yardim/iyzico-sanal-pos-kurulumu/)
- An official iyzico page states there is no setup fee, fixed fee or monthly fee. Current rates are not shown there — [iyzico (primary, via search snippet)](https://www.iyzico.com/en/business/fast)
- npm `iyzipay` latest is **2.0.71, published 2026-10-22**, with **23,473 downloads in the week 2026-10-16→22** — [npm registry (primary)](https://registry.npmjs.org/iyzipay), [npm downloads API](https://api.npmjs.org/downloads/point/last-week/iyzipay)
- The README covers `npm install iyzipay`, Node ≥ v0.10, config via apiKey/secretKey/uri or the env vars `IYZIPAY_API_KEY`/`IYZIPAY_SECRET_KEY`/`IYZIPAY_URI`, sandbox `https://sandbox-api.iyzipay.com`, mock test cards, and mock APM accounts. The examples use **callbacks** and **TypeScript is not mentioned** — [iyzipay-node GitHub (primary)](https://github.com/iyzico/iyzipay-node)
- The docs portal has sections for Online Ödeme, Pazaryeri (marketplace), payment methods, extra services, and a guide to applying marketplace stopaj rates — [docs.iyzico.com (primary)](https://docs.iyzico.com/)
- The bank-transfer product expects the customer to pay within 3 business days and checks banks every 15 minutes for matching — [iyzico docs (primary)](https://docs.iyzico.com/en/products/bank-transfer)

**PayTR**
- Rates are "dynamic", depending on revenue and business model, and typically 0.99–4.00% for e-commerce. That page was last updated 09.07.2025 — [IdeaSoft (secondary)](https://www.ideasoft.com.tr/paytr-komisyon-oranlari/)
- A Ticimax-merchant campaign offered 0% single-shot commission up to 50,000 TL or until 31 Aug 2026, with taksit rates by offer. It has likely expired — [Ticimax × PayTR (secondary)](https://www.ticimax.com/ticimax-ve-paytr-isbirligi/)
- Official dev portal products: iFrame API, Direkt API, Link API (payment links via SMS/email), **Kart Saklama API** (save, list, delete cards; pay with a saved card), **recurring payment with a saved card**, İade (refund) API, taksit oranları query, BIN query, test mode with test cards, and a guide for switching to live mode. Ready-made code examples exist, but Node.js is not named — [dev.paytr.com (primary)](https://dev.paytr.com/)
- npm has **no official PayTR SDK**. The community packages are stale: `paytr` 1.0.8 (2021-11-06) and `node-paytr` 1.1.0 (2022-10-14) — [npm registry (primary)](https://registry.npmjs.org/paytr), [npm registry](https://registry.npmjs.org/node-paytr)

**Craftgate (orchestration)**
- Official JS client `@craftgate/craftgate` 1.0.72, published 2026-10-20 — [npm registry (primary)](https://registry.npmjs.org/@craftgate/craftgate)
- Features: smart or dynamic routing to the cheapest contracted POS, "Autopilot" failover, card storage, one-click payment, recurring payments, closed-loop wallet, and link/QR payments. No public price list was found — [CB Insights profile (secondary)](https://www.cbinsights.com/company/blurple-studio), [Webrazzi 2021 (secondary)](https://webrazzi.com/2021/01/04/craftbase-ekibinden-bulut-tabanli-odeme-gecidi-craftgate)

### Inferences
- MVP pick: **iyzico Checkout Form or 3DS API, using `iyzipay`.** It has an official, actively maintained package (published three days before this research), a public sandbox and high npm usage. The SDK is callback-based with no bundled TypeScript types, so plan a thin promisified wrapper with your own types. PayTR is a fine second choice if its offer is cheaper, but you would write the HMAC-signed REST calls yourself (no official SDK). Craftgate only makes sense once you have two or more POS/PSP contracts and want routing or failover.
- The commission spread between sources (2.49% to 4.29% single-shot) suggests rates are negotiated per merchant and change often. Request written offers from iyzico, PayTR, Param and Sipay at the same time.
- Settlement of 7–21 days (one secondary source) is material for cash flow with perishable stock. Ask each provider for a "valörlü / valörsüz" settlement table.

### Gaps
- No official 2026 iyzico or PayTR price list could be fetched (iyzico's pricing URL returned 404). All rates above are third-party.
- **Param and Sipay**: no reliable pricing or SDK information found in this session; their npm packages `sipay` and `param-pos` do not exist. Check their developer portals directly.
- **3D Secure obligation**: no primary source (BDDK/TCMB regulation or provider policy) was found stating that 3DS is mandatory for all card-not-present transactions in Turkey. Practice is that providers enforce 3DS by default and allow non-3DS only for approved merchants; this is unverified. **[lawyer / provider]**
- The exact form of iyzico card storage (tokenization) and its subscription products was not confirmed from docs in this session, although PayTR's card storage was confirmed.
- Bank virtual POS (e.g., Garanti, İş, Akbank) pricing and integration were not researched; they usually require a company and higher volumes.

---

## 2. Cargo and logistics: carrier APIs, aggregators, costs, live-plant shipping, same-day İstanbul

### Takeaway
Use an aggregator for the MVP rather than signing and integrating each carrier separately. **Geliver** has an official **Node.js/TypeScript SDK** (`@geliver/sdk` 1.3.0, April 2026) and a marketplace-style "get offers, accept, label, track" API. Direct carrier contracts usually need 20–50 parcels a month. 2026 list prices for small parcels (0–3 desi) are roughly 78–95 TL + KDV at Aras and PTT (secondary sources, inconsistent). No Turkish carrier's written policy on live plants was found. Legally the seller bears transit damage until delivery (Mesafeli Sözleşmeler Yönetmeliği m.17), so packaging and claim handling are on you.

### Cited Findings
**Aggregators / multi-carrier**
- `@geliver/sdk` 1.3.0, published 2026-04-13, described as "Geliver API SDK (Node.js, TypeScript)" — [npm registry (primary)](https://registry.npmjs.org/@geliver/sdk)
- Geliver's API flow, per the official PHP SDK: get an API token, create a sender address, create a shipment, accept offers, then get the label and tracking. Docs are at docs.geliver.io (TR/EN) — [Packagist geliver/sdk (primary)](https://packagist.org/packages/geliver/sdk)
- Geliver pricing descriptions conflict. The Shopify app says it bills per desi in USD; the Wix app says per kg. Both point to a separate price list — [Shopify App Store (primary listing)](https://apps.shopify.com/geliver?locale=tr), [Wix App Market](https://www.wix.com/app-market/web-solution/geliver)
- Geliver also publishes an MCP server/CLI — [mcpservers.org (secondary)](https://mcpservers.org/zh-CN/servers/geliver-io-mcp-cli)
- BirFatura's integrator supports Aras, MNG, Yurtiçi, hepsiJET, UPS, Sürat, PTT, Sendeo and Kolay Gelsin. API keys and technical documents must be requested from each carrier — [BirFatura (secondary, vendor)](https://birfatura.com/kargo-entegrasyonlari/), [BirFatura](https://birfatura.com/kargo-entegrasyonu/)
- Gurmehub "Kargo Entegratör" lists DHL eCommerce, Yurtiçi, Sürat, PTT, Aras, DHL, UPS and Hepsijet, priced in tiers by monthly shipments (300/750) — [PickYourApp listing (secondary)](https://pickyourapp.com/collections/orders-and-shipping-shipping-solutions-shipping/products/gurmehub-yurtici-entegrasyonu)
- The Shopify app "Kargo Yönetimi" supports Yurtiçi, HepsiJET and Aras — [Shopify App Store](https://apps.shopify.com/kargo-yonetimi)

**Carrier contracts and costs (2026, all secondary and inconsistent)**
- Aras: 0–2 desi 83.93 TL + KDV, 3 desi 95.12 TL. PTT: from 77.54 TL for 1 desi (another source: 145 TL in-city, 200 TL inter-city for 0.5 kg/desi). Yurtiçi: positioned as "premium", with one source quoting contracted desi prices of 18–32 TL, which conflicts with the others. No reliable MNG figure — [IdeaSoft 2026 kargo ücretleri (secondary)](https://www.ideasoft.com.tr/e-ticaret-kargo-ucretleri/), [Zunapro (secondary)](https://www.zunapro.com/turkey/tr/blog/e-ticaret-kargo-anlasmalari-kargo-entegrasyonu-rehberi), [Kobitime (secondary)](https://kobitime.com/vergi-levhasiz-kargo-anlasmasi-2026/) (the search tool did not tie each figure to a single page, so treat them as indicative only)
- MNG (DHL eCommerce), Yurtiçi, Aras and PTT will contract with individual sellers, but most require a monthly minimum of about 20–50 parcels, with tiered discounts above about 500 a month — same sources as above (secondary)
- Hepsijet and Trendyol Express are marketplace-affiliated last-mile carriers with 50,000+ parcel lockers combined (claim) — [Zunapro (secondary)](https://www.zunapro.com/turkey/tr/blog/ecommerce-logistics-shipping-turkey)

**Live plants: shipping and damage**
- General guidance from carrier-guideline write-ups: prune and remove dead leaves, water adequately before packing, wrap foliage and stems in paper or bubble wrap, secure the pot and root ball, and avoid extreme weather — [ShipScience on UPS guidelines (secondary)](https://www.shipscience.com/?p=16404), [ShipScience on FedEx guidelines](https://www.shipscience.com/fedex-provides-guidelines-for-shipping-plants-and-plant-materials/)
- DHL's Turkish guidance lists puncture, crushing and moisture as the most common transit damage, and says the inner packaging must support the outer box — [DHL TR (primary, general)](https://www.dhl.com/tr-tr/home/global-forwarding/freight-forwarding-egitim-merkezi/uluslararasi-nakliye-tehlikeleri.html)
- **Legal allocation of transit risk:** the seller is responsible for loss or damage until the goods reach the consumer or a third party the consumer designates, unless the consumer chose a carrier other than the seller's (Mesafeli Sözleşmeler Yönetmeliği m.17) — [Lexpera consolidated text (primary)](https://www.lexpera.com.tr/mevzuat/yonetmelikler/mesafeli-sozlesmeler-yonetmeligi)
- Maximum delivery time is 30 days. If delivery becomes impossible, notify the customer within 3 days and refund within 14 days; lack of stock does not count as impossibility (m.16) — [Lexpera (primary)](https://www.lexpera.com.tr/mevzuat/yonetmelikler/mesafeli-sozlesmeler-yonetmeligi)

**Same-day İstanbul**
- Scotty (Scotty Kurye Dağıtım ve Teknolojileri A.Ş., Kağıthane/İstanbul) lists end-to-end logistics for retailers and e-commerce, including **API integration**, real-time tracking and route optimisation — [kariyer.net company profile (secondary)](https://www.kariyer.net/firma-profil/-scotty-teknoloji-ltd-sti-182660-195648)
- Otherwise only individual courier listings (Armut) came up, with no API — [Armut (secondary)](https://armut.com/sisli-kurye-cagir)

### Inferences
- MVP architecture: an **aggregator such as Geliver** behind a `ShippingProvider` interface. Geliver gives you a TypeScript SDK, rate comparison, labels and tracking without per-carrier SOAP/REST work. Add direct Yurtiçi, Aras or MNG contracts later when volume justifies negotiated rates.
- Desi = (W×L×H cm)/3000 is the standard Turkish formula (not verified this session). A plant in a rigid protective box quickly reaches 5–15 desi, so price tiers above 3 desi matter more than the headline 0–2 desi price.
- Because the seller bears transit risk (m.17), build in a damage-report flow (photo upload within X hours of delivery), carrier claim tracking, and a replacement policy. Prefer short transit: ship Monday to Wednesday so plants don't sit in a hub over the weekend.

### Gaps
- No primary carrier policy was found on whether Yurtiçi, Aras, MNG, PTT, Sürat, Hepsijet or Kolay Gelsin accept live plants, nor any damage-claim rules specific to plants. Ask each carrier for its "canlı/bitki/kırılacak eşya" terms.
- Official per-desi tariffs for 2026 were not available. Geliver's actual price list was not retrieved (docs.geliver.io rendered empty).
- Kargonomi and Basit Kargo: existence, APIs and pricing **could not be verified**.
- Getir, Banabi and other quick-commerce B2B courier offerings: **current 2026 availability could not be verified**. Searches returned only 2021 news. Scotty's API docs, cut-off times and prices were not found.
- Direct carrier developer portals (Yurtiçi web services, Aras, MNG/DHL eCommerce API) were not fetched.

---

## 3. SMS OTP: providers, pricing, API style, sender ID, İYS exemption

### Takeaway
Netgsm and İleti Merkezi are the mainstream Turkish SMS APIs (HTTP/REST and XML). Netgsm has a dedicated OTP product delivered within 3 minutes. Indicative 2026 pricing is about **8.7–13.2 kuruş per SMS**, derived from a 10,000-SMS Netgsm package at 871–1,321 TL. A custom sender ID (başlık) requires submitting company documents to the provider. OTP codes are not "ticari elektronik ileti" (their purpose is not commercial). The İYS regulation also explicitly removes İYS checks for transactional categories (m.6(1), (2) and (5)). So OTP and order/shipping SMS do not need İYS consent, provided they carry no promotional content.

### Cited Findings
- Netgsm OTP SMS: cannot be scheduled and is delivered within 3 minutes. Docs at netgsm.com.tr/dokuman — [netgsm1/otp GitHub (primary)](https://github.com/netgsm1/otp)
- Netgsm catalogue describes OTP SMS for passwords and confirmation codes — [Netgsm catalogue PDF (primary)](https://www.netgsm.com.tr/belgeler/tanitim/netgsm-katalog-en.pdf)
- Netgsm partner promo: first 10,000 SMS for 871 TL instead of 1,321 TL list price, campaign ending 31 July 2026. That works out to about 8.7 kuruş per SMS at the promo price and 13.2 kuruş at list (my arithmetic) — [Ticimax × Netgsm (secondary)](https://www.ticimax.com/ticimax-ve-netgsm-is-birligi-sms-entegrasyonu/)
- Netgsm can send with your own header (başlık) or a Netgsm subscriber number. A custom header requires sending the required documents to the SMS provider — [BirFatura Netgsm (secondary)](https://birfatura.com/netgsm-entegrasyonu/)
- npm: `netgsm` 1.1.0 (2021-07-29, community and stale); `iletimerkezi` 1.0.3 (2024-02-12), "iletimerkezi API wrapper for Node.js"; no `verimor` package — [npm registry netgsm (primary)](https://registry.npmjs.org/netgsm), [npm registry iletimerkezi](https://registry.npmjs.org/iletimerkezi)
- **İYS legal text** (Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik, RG 15.07.2015/29417, amended 04.01.2020 and 28.08.2020) — [Lexpera (primary)](https://www.lexpera.com.tr/mevzuat/yonetmelikler/ticari-iletisim-ve-ticari-elektronik-iletiler-hakkinda-yonetmelik):
  - m.4(1)(o): a ticari elektronik ileti is one sent "ticari amaçlarla" (for commercial purposes).
  - m.6(1): where the recipient gave contact details, messages about changes to, use of, or maintenance of goods or services they obtained need no consent.
  - m.6(2): no consent for "devam eden abonelik, üyelik veya ortaklık durumu ile tahsilat, borç hatırlatma, bilgi güncelleme" (ongoing subscription or membership status, collection, debt reminders, information updates), but no product may be promoted in them.
  - m.6(5): **no İYS check is done** for messages under m.6(1), (2) and (4).
  - m.5(2)–(3): anyone wanting to send commercial e-messages must register with İYS, and commercial messages cannot be sent to recipients without İYS consent. m.7(12): consents not recorded in İYS are invalid. m.7(11): consents collected outside İYS must be uploaded within 3 business days.
  - m.9(1), (4): recipients may refuse at any time, and every commercial message must include a refusal option. m.10(1): stop sending within 3 business days of a refusal.
  - m.8(2)–(3), (6): commercial SMS must contain the merchant's MERSİS number (tradespeople: name plus T.C. or tax number), a contact channel, and a label at the start showing the message's nature (e.g. promotion or campaign).
  - m.11(6)–(7): the SMS or email provider must not start sending for unregistered senders, and checks İYS consent before sending.
- Secondary sources likewise list invoice, delivery and subscription reminders as not requiring consent — [birfatura İYS (secondary)](https://birfatura.com/ileti-yonetim-sistemi-nedir-iys-nedir/), [ikas (secondary)](https://ikas.com/tr/blog/iys-ileti-yonetim-sistemi-nedir)

### Inferences
- OTP (login or verification code) has no commercial purpose, so it falls outside the m.4(1)(o) definition and needs no İYS consent or check. The regulation does not name OTP explicitly; this is an interpretation **[lawyer]**. Order confirmation, shipping and delivery SMS fit m.6(1)/(2) as long as they carry **no** promotional content. Never append "use code X for 10% off" to a transactional SMS.
- Marketing push, SMS and email (campaigns, abandoned-cart reminders with discounts) need: İYS registration of the brand, opt-in capture in the app (sync to İYS within 3 business days, or collect consent via İYS directly), MERSİS number and refusal option in each message, and suppression within 3 business days.
- Backend: one `SmsProvider` interface with Netgsm (OTP endpoint) or İleti Merkezi, and separate "transactional" and "marketing" channels and headers so the İYS check runs only on marketing.

### Gaps
- No official 2026 per-SMS price list was retrieved for Netgsm, İleti Merkezi, Verimor or Mutlucell. The figure above is derived from a reseller promo.
- BTK rules or timing for sender-ID (başlık) approval were not found from a primary source.
- İYS fees for brand registration and API packages were not researched. The Ticimax page mentions "İYS packages" with discounts, implying a paid tier.
- Whether a push notification counts as "ticari elektronik ileti" was not researched.

---

## 4. Invoicing: e-arşiv / e-fatura obligations and entegratör APIs

### Takeaway
Online sellers must issue **e-Arşiv faturas regardless of amount** to consumers (and to buyers not registered for e-Fatura). From 1 Jan 2026 the amount threshold has been removed for most taxpayers. The exception is basit usul and işletme hesabı taxpayers, for whom the threshold (3,000 TL incl. KDV) applies until 1 Jan 2027. E-commerce sellers must switch to **e-Fatura** once gross sales reach **500,000 TL** in a year (2022 or later), by 1 July of the following year. Use an entegratör with an API. Paraşüt has a documented REST API (OAuth credentials, e-arşiv and e-fatura endpoints, asynchronous jobs).

### Cited Findings
- Until 31.12.2025, e-Arşiv was mandatory for sales over 3,000 TL. From 1.1.2026 it applies "tutarına bakılmaksızın" (regardless of amount), per VUK General Communiqué No. 509 as amended. Those selling via websites or any electronic medium were already covered regardless of amount — [BirFatura (secondary)](https://birfatura.com/e-arsiv-fatura-zorunlulugu-olan-mukellefler/), [Sovos TR blog (secondary)](https://sovos.com/tr/blog/kdv/2025te-e-arsiv-ve-e-fatura-zorunlulugu-nasil-degisti/)
- VUK General Communiqué No. 589 (31.12.2025) changed the deadlines for basit usul and işletme hesabı taxpayers — [TÜRMOB e-kütüphane (secondary)](https://turmob.org.tr/ekutuphane/Read/1f08a2d9-db4b-46a6-af71-c8af1408e7c9), [Paraşüt blog (secondary)](https://www.parasut.com/blog/vergi-mevzuatinda-yeni-duzenlemeler)
- IdeaSoft (page updated 20.10.2026):
  - E-commerce e-Fatura threshold is 500,000 TL gross sales (2022 or later); reaching exactly 500k is enough. The general threshold is 3,000,000 TL.
  - Transition is due by 1 July of the following year (2025 revenue → 1 July 2026; 2026 revenue → 1 July 2027).
  - Basit usul / işletme hesabı: e-Arşiv above 3,000 TL until 1.1.2027, no limit after.
  - The buyer's registration status decides e-Fatura vs e-Arşiv.
  - Invoice within 7 days of delivery (VUK 231).
  - Penalty under VUK 353/1: at least 17,000 TL per document on first detection in a year.
  - [IdeaSoft (secondary)](https://www.ideasoft.com.tr/e-ticaret-icin-e-fatura-zorunlulugu/)
- Paraşüt offers e-Arşiv and e-Fatura modules — [Paraşüt e-Arşiv (primary)](https://www.parasut.com/e-arsiv-programi), [Paraşüt e-Belge (primary)](https://www.parasut.com/e-belge)
- Paraşüt API, from community package READMEs:
  - API access is requested by emailing support from the account email.
  - You receive a client_id, client_secret, username, password and company_id.
  - There are e-Arşiv, e-Fatura and e-Fatura inbox endpoints.
  - Recommended flow: check the buyer's VKN against the e-Fatura inbox list, then create an e-Fatura or e-Arşiv, then poll the asynchronous "trackable job", then fetch the PDF URL.
  - e-Arşiv can be cancelled within 7 days.
  - [Packagist theposeidonas/laravel-parasut-api (secondary)](https://packagist.org/packages/theposeidonas/laravel-parasut-api), [Packagist hakanispirli/parasut-laravel (secondary)](https://packagist.org/packages/hakanispirli/parasut-laravel)
- E-commerce withholding (stopaj) of **1%** was set by Presidential Decision 9284 (22 Dec 2024), effective 2025. Sources conflict on whether it reaches own-website sales and whether payment institutions such as iyzico or PayTR withhold. Most say only marketplaces (aracı hizmet sağlayıcılar) withhold. GVK Tebliğ 330 exempts some groups (esnaf muaflığı, basit usul) — [Webrazzi (secondary)](https://webrazzi.com/2024/12/23/e-ticarette-stopaj-orani-yuzde-1-olarak-belirlendi/), [Ticimax (secondary)](https://www.ticimax.com/blog/e-ticaret-stopaj-vergisi), [eleman.net (secondary)](https://www.eleman.net/is-rehberi/pratik-bilgiler/e-ticaret-stopaj-kesintisi-2025-h6303)

### Inferences
- MVP backend: on `order.paid` (or on shipment, within the 7-day VUK window), create the invoice through the entegratör API. Store the e-Arşiv UUID and PDF link on the order, and email or SMS the link to the customer. Make the job idempotent and retryable, because Paraşüt's job is asynchronous.
- For a B2C plant shop, almost all invoices are e-Arşiv. The e-Fatura branch matters only for corporate buyers (office plants) and after crossing 500k TL in sales.
- Selling only through your own app with iyzico or PayTR most likely means no marketplace stopaj. Confirm this. **[mali müşavir]**

### Gaps
- The text of VUK 509 and 589 was not fetched from gib.gov.tr or the Resmî Gazete. All thresholds above come via secondary sources (consistent with each other).
- Logo (e-Logo), Uyumsoft and Sovos (formerly Foriba): API features and prices were not researched. Paraşüt API pricing and plan requirements were not confirmed (apidocs.parasut.com rendered empty).
- Whether GİB's free e-Arşiv Portal can be used via API for automated issuance was not confirmed. In practice the portal is manual, so automation needs an entegratör.
- KDV rate for live potted plants (and any reduced rate) was not researched. **[mali müşavir]**

---

## 5. Law and compliance: 6563 & ETBİS, Mesafeli Sözleşmeler (cayma hakkı and perishables), KVKK, İYS, required pages

### Takeaway
Before the first sale, register the app and domain in **ETBİS** (eticaret.gov.tr via e-Devlet) and report changes within 30 days. Every checkout must show an **ön bilgilendirme formu** and **mesafeli satış sözleşmesi** that the customer confirms. Those documents must state cayma hakkı correctly; if you get this wrong, the withdrawal window extends by a year. Live plants are **not named** in the cayma exceptions. The relevant exception is m.15(1)(c) "çabuk bozulabilen… mallar", which is interpreted narrowly, so relying on it for potted houseplants is a legal risk **[lawyer]**. KVKK requires an aydınlatma metni, açık rıza only where no other legal basis applies, and (for most small companies) **no VERBİS registration** below 50 employees and 100M TL balance sheet. If you use foreign cloud, SMS or analytics vendors, sign a KVKK **standard contract** and notify the Board within 5 business days.

### Cited Findings
**6563 / ETBİS**
- Service providers and intermediary service providers must register in ETBİS "faaliyete başlamadan önce" (before starting activity), via e-Devlet. Registrants are verified via MERSİS/ESBİS.
- Required data: MERSİS and tax number (or T.C. and tax number for esnaf), **the mobile app and domain used**, KEP address, e-commerce type, goods offered, payment methods, and whether second-hand goods are sold.
- Changes must be reported within 30 days. Payment institutions and cargo companies also report monthly.
- Legal basis: Law 6563 and the ETBİS Tebliğ, in force 11/8/2017.
- [Ticaret Bakanlığı duyuru (primary)](https://ticaret.gov.tr/duyurular/elektronik-ticaret-bilgi-sistemine-etbis-kayit-ve-bildirim-esaslari)
- Displaying the ETBİS QR code in the footer is a practitioner recommendation that the official page does not mention — [ikas (secondary)](https://ikas.com/tr/blog/etbis-nedir); one accounting FAQ wrongly suggests domestic-only sellers needn't register — [muhasebenews (secondary)](https://www.muhasebenews.com/?p=122838)

**Mesafeli Sözleşmeler Yönetmeliği** (RG 27.11.2014/29188; in force 27.02.2015; consolidated v7 in force 01.01.2026; amended 23.08.2022 (RG 31932), 04.11.2023, 10.08.2024, 24.05.2025 (RG 32909, changing m.5(1)(g), 12, 13 and repealing 15(1)(i)); Danıştay annulled m.15(1)(ı), (j), (k) on 06.05.2026) — [Lexpera consolidated (primary)](https://www.lexpera.com.tr/mevzuat/yonetmelikler/mesafeli-sozlesmeler-yonetmeligi):
- m.5: pre-contract information covers product features, seller identity and registration numbers, contact details, total price incl. taxes, delivery costs, complaint channels, withdrawal terms and dispute resolution. The seller bears the burden of proof (m.5(6)).
- m.6–7: information must be on a durable medium, and the consumer must **confirm** it, otherwise the contract is not formed. m.8: the order button must make the payment obligation clear.
- m.9: 14-day withdrawal without reason; for goods it starts on receipt. m.10: if not informed, the period doesn't start and the right lapses one year after the normal period would have ended.
- m.12: refund all payments, including delivery, within 14 days via the original payment method. m.13: consumer returns within 14 days; return cost only if agreed and not above delivery cost.
- m.15(1)(c), verbatim: "Çabuk bozulabilen veya son kullanma tarihi geçebilecek malların teslimine ilişkin sözleşmeler" are excepted from cayma. The article opens with "Taraflarca aksi kararlaştırılmadıkça", so the seller may voluntarily grant cayma anyway. (b) custom-made goods are also excepted.
- m.16: deliver within at most 30 days. m.17: the seller bears the risk until delivery.
- Exceptions are interpreted narrowly and case by case — [hukukcularevi (secondary)](https://hukukcularevi.com/mesafeli-sozlesme-cayma-hakki-istisnalari/)
- Retail practice: Migros labels a succulent product as perishable and non-returnable (a seller policy, not law) — [Migros product page (secondary)](https://www.migros.com.tr/ecoplant-succulent-q85-p-1b90c9b)
- News reports of a 30-day cayma period relate to **doğrudan satış** (direct and door-to-door sales), not distance sales; status unverified — [Sabah (secondary)](https://sabah.com.tr/ekonomi/cayma-hakki-30-gune-cikiyor-7374531), [Bengütürk (secondary)](https://www.benguturk.com/ekonomi/tuketiciler-dogrudan-satislarda-30-gun-icinde-cayma-hakkini-kullanabilecek-212067h)

**KVKK**
- Law 7499 art.34 amended KVKK m.9 (cross-border transfer). Transfers can rely on **standard contracts**, which must be notified to the Board **within 5 business days** of signature. The online "Standart Sözleşme Bildirim Modülü" was launched by Board decision 2024/1793 (17.10.2024). Notification can be physical, via KEP, or through the module. The Board's standard-contract texts may be changed only in their optional clauses — [Alomaliye KVKK duyurusu (secondary, reproducing KVKK announcement)](https://www.alomaliye.com/2024/10/30/kvkk-standart-sozlesme-bildirim-modulu/), [Alomaliye 2025](https://www.alomaliye.com/2025/02/06/yurt-disina-kisisel-veri-aktariminda-kullanilacak-standart-sozlesmelerde-dikkat-edilmesi-gereken-hususlar/amp/)
- Failing to notify: administrative fine of 50,000–1,000,000 TL, revalued annually. Board decision 2024/959 sets the content elements. Changes to the parties or content, or termination, also require notification — [Hukuki Haber (secondary)](https://www.hukukihaber.net/kvkk-yurt-disina-aktarim-kapsaminda-yapilan-kanun-degisikligi), [Erdem & Erdem (secondary)](https://www.erdem-erdem.av.tr/bilgi-bankasi/kisisel-verilerin-yurt-disina-aktarilmasinda-yasanan-son-gelismeler), [Bilal Alyar (secondary)](https://bilalalyar.av.tr/kvkk-uluslararasi-veri-aktarimi/)
- **VERBİS exemption** stays at fewer than 50 employees **and** below 100M TL annual balance sheet for controllers whose main activity isn't special-category data. Board decision 2025/1572 (04.09.2025; RG 01.10.2025/33034) added a micro exemption (under 10 employees and 10M TL) for special-category processors — [Erdem & Erdem (secondary)](https://www.erdem-erdem.av.tr/bilgi-bankasi/verbis-kayit-yukumlulugune-iliskin-istisna-kriteri-degistirildi)
- A Board interpretation of 25.12.2025 reportedly says that controllers not keeping balance-sheet-basis books are assessed on employee count only. Only one source reports this — [CottGroup (secondary)](https://www.cottgroup.com/en/blog/item/verbise-kayit-yukumlulugu-istisnasina-iliskin-uygulama-esaslari-netlestirildi)

**İYS**: see Section 3 for the regulation citations.

### Inferences
- **Cayma for plants:** a potted houseplant is alive but not "çabuk bozulabilen" in the way cut flowers or food are; with care it lasts months or years. The narrow-interpretation principle and the m.5(6) burden of proof make a blanket "no returns on plants" clause risky. A safer MVP policy:
  - grant 14-day cayma (the m.15 opening allows voluntary grant);
  - state clearly that the consumer must keep the plant in reasonable condition (m.13: liability only for changes beyond normal use);
  - separately handle "arrived damaged or dead" as a seller-liability (m.17) or ayıplı mal claim with a photo flow;
  - reserve the perishable exception for genuinely perishable SKUs (cut flowers, bouquets).
  - **[lawyer to confirm]**
- **Checkout backend requirements:**
  - Render the ön bilgilendirme formu and mesafeli satış sözleşmesi with the actual order data (items, prices incl. KDV, shipping fee, seller MERSİS/VKN, address, KEP, complaint channels).
  - Store the exact text version, timestamp, IP or device ID, and the user's explicit confirmation per order; this is the m.5(6)/m.7 evidence.
  - Email the PDF to the customer (durable medium).
  - Build cayma request, refund-within-14-days, and 3-day impossibility-notice workflows.
- **KVKK backend:**
  - Write an aydınlatma metni per processing activity (membership, order, delivery, marketing).
  - Use a separate, unbundled açık rıza checkbox only where needed (e.g. marketing or non-essential cookies and analytics), not for order processing, which rests on contract performance.
  - Keep a data inventory, retention periods and a deletion job.
  - Choose cloud regions: if hosting or vendors are abroad (AWS/GCP EU, Firebase, Sentry, Twilio), sign the KVKK standard contract per vendor and notify within 5 business days, or prefer a TR region.
- **Required in-app and web pages (MVP):**
  - Mesafeli Satış Sözleşmesi
  - Ön Bilgilendirme Formu
  - İade ve Cayma Politikası
  - KVKK Aydınlatma Metni
  - Açık Rıza Metni (marketing)
  - Gizlilik Politikası
  - Çerez Politikası (web) with consent banner
  - Üyelik Sözleşmesi / Kullanım Koşulları
  - İletişim and company info (unvan, MERSİS/VKN, address, KEP, phone), plus ETBİS QR (recommended)

### Gaps
- The text of Law 6563 was not fetched from mevzuat.gov.tr. ETBİS non-compliance fines were not found.
- No hakem heyeti or Yargıtay decision was found on whether live potted plants fall under m.15(1)(c). This is the key open legal question. **[lawyer]**
- The full content of the 2025 amendment (m.5(1)(g), 12, 13) and the Danıştay annulment of 15(1)(ı)–(k) were not reviewed in detail.
- KVKK m.9 after the 2024 amendment (adequacy decisions, appropriate safeguards, the incidental-transfer derogation; effective date 1 June 2024, from background knowledge) was not verified from the primary text this session.
- KVKK Çerez Rehberi (cookie guidance) and its rules were not fetched. The cookie policy requirement is an inference.

---

## 6. Plant-specific regulation: does reselling potted houseplants need a Tarım ve Orman Bakanlığı registration, permit or plant passport?

### Takeaway
**Producers** of ornamental plants must hold a *Süs Bitkisi Üretici Belgesi*, register with the il/ilçe müdürlüğü and join the producers' sub-union. The ornamental-plant regulation **excludes from its scope "nihai tüketicilere süs bitkileri… satışı yapanlar"** (those selling to final consumers), which favours a pure B2C reseller. Separately, the **Bitki Pasaportu** regulation requires *operators* (producers, importers, **traders**, storers) of plants on its **Ek-1** list to register and use plant passports. Its only explicit exemptions are own-use producers and table potatoes. Whether common potted houseplants are on Ek-1 was **not verified**. A reseller should source only from registered producers with passports where required, and ask the local İl Tarım ve Orman Müdürlüğü whether it must register as an operator.

### Cited Findings
- Süs Bitkileri ve Çoğaltım Materyallerinin Üretimi ve Pazarlamasına Dair Yönetmelik, RG 30.04.2015/29342 — [Lexpera (primary)](https://www.lexpera.com.tr/mevzuat/yonetmelikler/sus-bitkileri-ve-cogaltim-materyallerinin-uretimi-ve-pazarlamasina-dair-yonetmelik):
  - m.2(2): out of scope are "nihai tüketicilere süs bitkileri ve çoğaltım materyalleri satışı yapanlar" (along with own-use producers, research producers, state nurseries and CITES species).
  - m.4(h): "pazarlama" covers holding stock, displaying or offering for sale, and selling or delivering.
  - m.6(1): **producers** must hold a Süs Bitkisi Üretici Belgesi (a), register with the Müdürlük (b) and join the Süs Bitkileri Üreticileri Alt Birliği (c). No separate registration duty is set for non-producing sellers. "Nihai tüketici" is not defined in this regulation.
- Bitki Pasaportu Sistemi ve Operatörlerin Kayıt Altına Alınması Hakkında Yönetmelik, RG 12.01.2011/27813 (in force 01.12.2011; amended 28.03.2017, 08.07.2019, 15.04.2021) — [Lexpera (primary)](https://www.lexpera.com.tr/mevzuat/yonetmelikler/bitki-pasaportu-sistemi-ve-operatorlerin-kayit-altina-alinmasi-hakkinda-yonetmelik-1):
  - m.2(1): covers Ek-1 plants and plant products and their producers, importers, **traders** and storers.
  - m.7(1): "Ek-1'de listelenmiş bitki, bitkisel ürün ve diğer maddelere bitki pasaportu eşlik etmek zorundadır" (Ek-1 items must be accompanied by a plant passport).
  - m.4(1)(b): "bitki" includes "canlı bitkiler". m.4(1)(j) defines "nihai tüketici".
  - m.17: exemptions only for non-commercial own-use producers and table potatoes (whose sellers to final consumers are not registered).
  - Based on legal basis 5996 sayılı Kanun.
- Registration is applied for at the il/ilçe müdürlüğü or zirai karantina müdürlüğü (in person or by e-signature). The operator signs a Taahhütname and receives a Kayıt Sertifikası. When Ek-1 material is sold to a final consumer, one passport stating the batch quantity suffices — [Tarım ve Orman BPKTS kılavuzu İl/İlçe (primary)](https://www.tarimorman.gov.tr/GKGM/Belgeler/DB_Bitki_Sinir/DB_Bitki_Sagligi/BPKTS-Kilavuz-Il-Ilce-Mudurlugu.pdf), [BPKTS kılavuzu Zirai Karantina (primary)](https://www.tarimorman.gov.tr/GKGM/Belgeler/DB_Bitki_Sinir/DB_Bitki_Sagligi/BPKTS-Kilavuz-Zirai-Karantina-Mudurlukleri.pdf) (via search summary; PDFs not read in full)
- Imported ornamental plants have their own implementing circular (Süs Bitkileri İthalatı Uygulama Genelgesi 2019/3) — [Lexpera (primary)](https://www.lexpera.com.tr/mevzuat/genelgeler/sus-bitkileri-ithalati-uygulama-genelgesi-2019-3)

### Inferences
- **Reseller that buys from Turkish growers and sells B2C:** most likely outside the ornamental-plant regulation (m.2(2)), so it needs no Süs Bitkisi Üretici Belgesi. It may still count as an "operator" (trader or storer) under the plant-passport regulation if any SKU is on Ek-1. If it has a warehouse holding stock, ask the İl Müdürlüğü about operator registration.
- **If you propagate or grow plants yourself** (cuttings, repotting into new substrate for sale), you may become a "producer". That triggers the Üretici Belgesi, registration and Alt Birlik membership.
- **If you import plants**, phytosanitary certificates, zirai karantina controls and the import circular apply. This is outside MVP scope.
- Product data model: store supplier or producer registration number and, where applicable, plant-passport reference per batch. This makes provenance auditable.

### Gaps
- **Ek-1 contents not verified.** Whether common houseplants (Monstera, Ficus, Sansevieria, succulents, etc.) need passports is unresolved; the list exists only as a PDF annex.
- Whether a pure online reseller with no warehouse must register as an operator was not confirmed by any primary guidance. **[İl Tarım ve Orman Müdürlüğü / lawyer]**
- Pesticide or soil and peat (substrate) rules for sold potting media were not researched.

---

## 7. App store requirements relevant to the backend

### Takeaway
Both Apple and Google require **in-app account deletion** (not just deactivation). Google additionally requires a **web URL** for deletion requests, entered in the Data safety form. Physical goods (plants) **must** be paid with non-IAP methods (card or Apple Pay), so using iyzico or PayTR inside the app is allowed and expected.

### Cited Findings
- Apple 5.1.1(v): "If your app supports account creation, you must also offer account deletion within the app." Apple 3.1.3(e): physical goods or services consumed outside the app "must use purchase methods other than in-app purchase… such as Apple Pay or traditional credit card entry" — [App Store Review Guidelines (primary)](https://developer.apple.com/app-store/review/guidelines/)
- Apple deletion details — [Apple: Offering account deletion (primary)](https://developer.apple.com/support/offering-account-deletion-in-your-app/):
  - Delete the whole account record and associated personal data; deactivation alone is insufficient.
  - A web link is allowed only if it goes directly to the deletion page.
  - Non-regulated apps must not require a call, email or support chat. Confirmation (e.g. an emailed or SMS code) is OK.
  - Deletion may be manual but must take a reasonable time, and users must be told the timeline and notified when it's done. If you must retain data, say what is kept.
  - Sign in with Apple apps must revoke tokens via the REST API.
- Google Play deletion requirements — [Google Play Console Help (primary)](https://support.google.com/googleplay/android-developer/answer/13327111):
  - An in-app path to delete the account and data, plus a web link where deletion can be requested without the app, entered in the Data safety form.
  - Delete data declared in Data safety and ask service providers to delete theirs.
  - Data can be retained for security, fraud or regulatory reasons if disclosed.

### Inferences
- Backend: `DELETE /me` (or a "request deletion" endpoint with an OTP confirmation) that:
  - hard-deletes or anonymises profile, addresses, saved-card tokens (call the PSP's delete-card API) and push tokens;
  - keeps invoices and order records legally required to be retained (VUK and commercial-law retention periods, **[mali müşavir]** to confirm), pseudonymised and disclosed in the privacy policy;
  - propagates deletion to vendors (SMS, analytics, CRM).
  - Provide a public web form as well, for Google.
- Privacy labels (App Store "nutrition labels" and Google Data safety) must match what you collect: name, phone, email, address, purchase history, device IDs, and crash data. Keep a single data inventory shared by KVKK and the store forms.

### Gaps
- Apple privacy-label details were not fetched, and no Turkey-specific App Store requirements were found.

---

## 8. Business setup basics: şahıs şirketi vs limited şirket, e-commerce tax notes

### Takeaway
A şahıs şirketi is cheaper and faster to set up but has unlimited personal liability and progressive income tax. A limited şirket pays a flat 25% corporate tax plus 10% withholding on distributed dividends, and costs about 3x more to set up. Either can register in ETBİS and get iyzico or PayTR. Choose based on expected profit and liability **[mali müşavir]**.

### Cited Findings
- Şahıs şirketi: no legal personality; profit is taxed in the owner's progressive income tax brackets; unlimited liability. Limited şirket: 25% corporate tax, plus 10% stopaj on dividend distribution — [Paraşüt blog (secondary)](https://www.parasut.com/blog/sahis-sirketi-ile-limited-sirket-arasindaki-farklar), [Ticimax (secondary)](https://www.ticimax.com/blog/sahis-sirketi-mi-limited-sirket-mi)
- 2026 setup cost estimates: şahıs about 8,000–13,500 TL, limited about 24,000–32,000 TL. A limited company also needs a mali mühür or e-signature and an accountant — [Faturaport 2026 (secondary)](https://www.faturaport.com/blog/crm/2026-sirket-kurma-maliyetleri-nelerdir-sahis-limited-anonim-karsilastirmasi)
- Practitioner guides on choosing a company type for e-commerce — [FFK Partner Hukuk 2026 (secondary)](https://www.ffkpartnerhukuk.com.tr/sirket-turu-nasil-secilir-2026-guncel-ve-kapsamli-rehber/), [IdeaSoft (secondary)](https://www.ideasoft.com.tr/e-ticaret-icin-sirket-kurmak/)
- E-commerce stopaj (1%) applies mainly to marketplace sales; GVK Tebliğ 330 exempts basit usul and some others (see Section 4) — [Ticimax (secondary)](https://www.ticimax.com/blog/e-ticaret-stopaj-vergisi)
- Kargo contracts without a vergi levhası are discussed for 2026, i.e. a company is typically expected for carrier contracts — [Kobitime (secondary)](https://kobitime.com/vergi-levhasiz-kargo-anlasmasi-2026/)

### Inferences
- For an MVP with modest early profit, a şahıs şirketi (bilanço or işletme esası) is the usual low-cost start. Move to a Ltd. when profit or liability grows. Note that işletme-esası taxpayers have the 3,000 TL e-Arşiv threshold until 1.1.2027, but online sales are e-Arşiv regardless of amount anyway.
- A KEP address is needed for ETBİS. MERSİS registration (Ltd.) or a T.C. and tax number (şahıs) is a prerequisite for ETBİS, PSP onboarding and the MERSİS number in İYS messages.

### Gaps
- 2026 GVK income-tax brackets and the basit usul eligibility of e-commerce were not verified from GİB.
- "Genç girişimci" exemptions (GVK 20/A) and SGK (Bağ-Kur) premium support for new founders were not researched. **[mali müşavir]**
