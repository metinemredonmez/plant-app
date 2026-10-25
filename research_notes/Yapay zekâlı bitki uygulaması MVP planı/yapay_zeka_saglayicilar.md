# AI technology options for a consumer plant app backend (ID, health diagnosis, LLM care assistant), 2026

Pages checked 2026-10-25 unless noted. Prices are in the provider's own currency: Kindwise and Pl@ntNet in EUR, LLMs in USD. Anything marked **ESTIMATE** is my own calculation, not a provider figure. Target stack: NestJS 12 + Prisma 7 + PostgreSQL backend, Expo React Native client, Turkish UI.

## 1. Specialized plant ID and health APIs (Kindwise Plant.id / plant.health / crop.health, Pl@ntNet, Plantix/PEAT, iNaturalist/Seek, Google Cloud Vision)

### Takeaway
Only two vendors offer a self-serve plain-HTTPS API at a published price: Kindwise and Pl@ntNet.
- **Kindwise** (plant.id + plant.health) is the only one with both species ID and a disease/pest diagnosis API, priced at €0.05 to €0.01 per credit.
- **Pl@ntNet** is about 4x cheaper for ID (€0.005 per ID, €1,000/yr minimum, 500 free per day) but has no disease diagnosis.
- **Plantix/PEAT** is B2B and quote-only.
- **iNaturalist's** vision model has no public commercial API.
- **Google Cloud Vision** gives generic labels and is not a species identifier.

### Cited Findings

#### Kindwise: plant.id (species ID)
- **Coverage claims:** "35 000+ classes" of plants (houseplants, ornamentals, trees, weeds). Kindwise claims 93% correct species in the top 3. It also cites an AoB Plants study that found plant.id better than PlantNet, iNaturalist and Google Lens on British flora. These are vendor claims. — [Kindwise plant.id](https://www.kindwise.com/plant-id)
- **Returned data:** common names, synonyms, taxonomy, GBIF and iNaturalist IDs, Wikipedia images, and some care fields. Care-field coverage is low on Kindwise's own figures: about 9% of taxa for watering, propagation or edible parts. Toxicity is not mentioned. — [Kindwise plant.id](https://www.kindwise.com/plant-id)
- **Vendor comparison against GPT-4 Turbo** (Feb 16–25, 2024, n=50 expert-verified API photos, about 60% houseplants), top-1 species error rate: Plant.id 12% vs GPT-4 Turbo 58%. Top-3 species error: 4% vs 36%. Genus top-1 error: 8% vs 36%. Small sample, run by the vendor. — [Kindwise blog](https://www.kindwise.com/post/the-plant-identification-battle-gpt-4-vs-plant-id)
- **Pricing (prepaid credits, EUR):** 100 free trial credits. Price per credit by volume:

  | Purchase volume | Price per credit | Minimum order |
  |---|---|---|
  | 1k+ | €0.05 | €50 |
  | 10k+ | €0.03 | €300 |
  | 50k+ | €0.02 | €1,000 |
  | 200k+ | €0.015 | €3,000 |
  | 800k+ | €0.012 | €9,600 |
  | 1.5M+ | €0.01 | €15,000 |

  "Purchased credits are valid for 3 months", with an exception stated for purchases under 30,000 credits (the wording is ambiguous). There is no subscription; long-term clients can be invoiced monthly in arrears. Lower prices are available if you only need a reduced set of classes. — [Kindwise pricing](https://www.kindwise.com/pricing)
- **Credit costs per call:**
  - Identification: 1 credit.
  - Adding a health assessment: `health=auto` costs 2 credits if a health result is returned and 1 if not; `health=all` costs 2 credits. — [plant.id v3 Postman docs](https://documenter.gw.postman.com/view/metadata/2s93z5A4v2); [Kindwise plant.health](https://www.kindwise.com/plant-health)
  - Detail lookups: 0.5 credits. Search: free. — [Kindwise handbook](https://www.kindwise.com/handbook)
  - Retrieving or deleting an identification: 0 credits. — [Kindwise FAQ](https://www.kindwise.com/faq)
- **Rate limits and SLA:** "no limits or caps on the number of API requests". The SLA promises more than 99.5% availability and at most 3 s processing time. Average latency is about 0.5 s. Identifications may queue if you send several requests per second. — [Kindwise FAQ](https://www.kindwise.com/faq)
- **Image guidance:** 1–2 MP is optimal and images should never exceed 2 MP. A long side of about 800 px gives faster responses. Up to 5 photos per call; 3 are usually enough. The response has up to 10 suggestions, and suggestions under 1% confidence are dropped. — [Kindwise FAQ](https://www.kindwise.com/faq)
- **Languages:** the `language` parameter takes ISO 639-1 codes (default `en`). A third-party listing says up to 3 languages can be requested per call. — [plant.id v3 Postman docs](https://documenter.gw.postman.com/view/metadata/2s93z5A4v2); [Zyla listing](https://zylalabs.com/api-marketplace/machine+learning/plant+identification+api/4668)
  - plant.health lists Turkish (`tr`) among its 17 languages for disease details and treatment.
  - For plant.id, descriptions come back in the requested language "if available"; there is no full list. — [Kindwise handbook](https://www.kindwise.com/handbook)
- **Retention:** results can be retrieved for 6 months per the [Kindwise handbook](https://www.kindwise.com/handbook), but the [Kindwise FAQ](https://www.kindwise.com/faq) says "at least 3 months". The two pages conflict.
- **Hosting:** photos are on Google Cloud Storage and relational data on a DigitalOcean managed database, with server-side encryption. The FAQ mentions a "data center in Central Europe". — [Kindwise FAQ](https://www.kindwise.com/faq)
- **Content licensing:** "all content can be used for commercial purposes". About 70% of similar images are under Kindwise's T&C licence; about 30% are CC BY, which requires the author's name and licence name to be shown. — [Kindwise FAQ](https://www.kindwise.com/faq)
- **SDK:** an official Python client exists ([kindwise-api-client on PyPI](https://pypi.org/project/kindwise-api-client/)). Docs are a Postman collection, and Kindwise publishes an OpenAPI spec at [agents.kindwise.com/openapi.json](https://agents.kindwise.com/openapi.json). I found no official Node SDK, so a plain fetch/axios client in NestJS is the expected route.

#### Kindwise: plant.health / crop.health (diagnosis)
- **plant.health coverage:** 548 classes covering abiotic disorders, pests, fungal/bacterial/viral diseases, and harmless look-alikes. A `disease_level=general` option returns coarser classes. — [Kindwise plant.health](https://www.kindwise.com/plant-health)
- **Accuracy claim:** 73% of queries have the correct diagnosis in the top 3 (vendor). — [Kindwise plant.health](https://www.kindwise.com/plant-health)
- **Scope:** all plant types, but annotations are mostly for houseplants and ornamentals. **crop.health** focuses on diseases of selected food crops. — [Kindwise plant.health](https://www.kindwise.com/plant-health)
- **Pricing:** a diagnosis is 1 credit (base €0.05). Getting both plant.id and plant.health results costs 1 credit each. — [Kindwise plant.health](https://www.kindwise.com/plant-health)

#### Pl@ntNet API
- **Free plan:** 500 identifications per day.
- **Pro plan:** €1,000/yr plus €0.005 per ID up to 3M, then €0.004 (>3M), €0.003 (>30M), €0.002 (>300M). No logo required. Contracts in EUR or USD.
- **Non-profit plan:** free, logo required.
- Coverage is "50,000+ species", "50+ languages", "European hosted", and can be restricted to a particular flora. — [Pl@ntNet pricing](https://my.plantnet.org/pricing)
- **Terms of use:**
  - Commercial use beyond 500 requests/day is paid and needs a signed licence. The base fee of €1,000 covers 200,000 requests/year with no carry-over; overage is €5 per 1,000.
  - Rate limits: 20 simultaneous requests per client, and a 1M/day "security quota" for Pro.
  - Image handling: "The photos sent by the user are not stored in the database". Only image URLs are kept in query history.
  - Liability: "In no event shall Pl@ntNet be liable for the accuracy of the results".
  - Multiple free accounts are prohibited.
  - — [Pl@ntNet API terms](https://my.plantnet.org/terms_of_use)
- **Reference images in responses** are usually CC BY-SA and need attribution in the form "Photo(s): [Contributor] / Pl@ntNet, CC BY-SA". Using the Pl@ntNet trademark/logo needs permission. — [Pl@ntNet using images](https://my.plantnet.org/doc/references/using-images); [Pl@ntNet general terms](https://identify.plantnet.org/terms_of_use)
- **API shape:** `POST https://my-api.plantnet.org/v2/identify/{project}?api-key=...`
  - Inputs: up to 5 JPG/PNG images (50 MB total), `organs` (leaf/flower/fruit/bark/auto), `lang`, `project` (`all` or a regional flora), `nb-results`, `include-related-images`, `detailed`.
  - Non-plant rejection: by default the service rejects images whose top result is not a plant; `no-reject=true` turns this off.
  - Response: species with a score between 0 and 1, `commonNames`, GBIF id, POWO id, `predictedOrgans`, and `remainingIdentificationRequests`. — [Pl@ntNet identify docs](https://my.plantnet.org/doc/api/identify)
- **No disease or health endpoint** is offered on the pricing page or in the identify docs. — [Pl@ntNet pricing](https://my.plantnet.org/pricing)

#### Plantix / PEAT
- The consumer app is free. The "API Toolkit" is B2B and priced "on request", with volume pricing and white-label options. — [ki-syndikat.de (checked June 2026)](https://www.ki-syndikat.de/tools/plantix/)
- An aggregator claims 780+ plant damages across 30 crops and says PEAT GmbH was acquired by Helm AG in 2023. This is low authority and uncorroborated. — [Stork.ai](https://www.stork.ai/en/plantix)
- A 2016 article cited 120+ pests and diseases on 30 crops (outdated). — [FAO e-agriculture](https://www.fao.org/e-agriculture/fr/node/13281)

#### iNaturalist / Seek
- Forum users describe the vision API as undocumented and "not really intended for use by the general public" outside iNat's own apps. Access is reportedly limited to approved parties. — [iNat forum](https://forum.inaturalist.org/t/hidden-computer-vision-api/41775)
- A forum post quotes iNaturalist's Terms of Use as prohibiting the use of iNat data to train AI/ML models for commercial purposes. Staff point to the AWS Open Data copy, but whether the restriction applies there is unresolved in the thread. — [iNat forum](https://forum.inaturalist.org/t/can-i-use-inaturalist-aws-open-data-to-train-commercial-ai-model/77663)

#### Google Cloud Vision
- Label Detection: first 1,000 units/month free, $1.50 per 1,000 for units 1,001–5M, $1.00 per 1,000 above 5M. Each feature applied to an image is billed as its own unit. — [Cloud Vision pricing](https://cloud.google.com/vision/pricing) (via search snapshot; a direct fetch of the page returned only its title)

#### Independent benchmarks of plant ID apps
- **Hart et al. 2023, *People and Nature* 5(3):929–937** ([doi:10.1002/pan3.10460](https://doi.org/10.1002/pan3.10460)): 857 expert-identified images of 277 species. Apps tested: Google Lens, Seek, LeafSnap, PlantNet, PlantSnap.
  - Across all apps: 69% correct as the first suggestion and 85% correct within the top 5.
  - At least one of the 3 best apps got 96% right as its first suggestion.
  - Plant type (woody, forbs, grasses and so on) significantly affected accuracy. — [Glos eprints](https://eprints.glos.ac.uk/12421)
- **East Scotland urban flora survey:** all apps improved by about 20 percentage points between 2020 and 2023. The best (Flora Incognita, PlantNet) reached species level 80–90% of the time. — [UWA repository](https://research-repository.uwa.edu.au/en/publications/application-and-pitfalls-of-the-use-of-plant-id-apps-for-urban-fl/) (summary via search snippet)
- **Estonian flora** (1,501 database images plus 1,000 field observations): PlantNet and Flora Incognita were each about 80% correct in the field and had the correct species in the top 5 about 90% of the time. This is a young-scientists contest entry, so treat it as low authority. — [EUCYS 2021](https://eucys2021.usal.es/?p=19172)
- **Penang Botanical Garden study (J. Sustainability & Natural Resources, Dec 2025):** compared PlantNet, PlantSnap, iNaturalist, PictureThis and LeafSnap on 100 taxa. I did not retrieve its results. — [UTHM](https://publisher.uthm.edu.my/ojs/index.php/jsunr/article/download/24478/8310/125832)

### Inferences
- **Recommended provider split:**
  - Kindwise for diagnosis, the only self-serve, priced plant-disease API found.
  - Either Kindwise (one vendor, one image upload, combined `health=auto` call) or Pl@ntNet (about 3–4x cheaper per ID at scale, EU-hosted, images not stored) for species ID.
- **Pl@ntNet free tier:** 500/day ≈ 15k/month could carry a soft launch. The terms say commercial use *beyond* 500/day is paid, which implies commercial use under 500/day is allowed. Confirm this with Pl@ntNet in writing.
- **Kindwise credit expiry:** with 3-month validity, buy one quarter of expected volume at a time. Buying a year up front to reach a lower tier is risky.
- **Google Cloud Vision** is best treated as an "is this a plant" pre-filter at most, not an identifier. My general knowledge, not verified this session, is that it returns generic labels ("plant", "flower") rather than species. Pl@ntNet's built-in non-plant rejection makes it unnecessary if Pl@ntNet is used.

### Gaps
- Whether plant.id returns **Turkish common names** for most species. Only plant.health's `tr` support is confirmed. Test with `language=tr` during the 100-credit trial.
- Whether Pl@ntNet `/v2/languages` includes `tr`. Not confirmed; call the endpoint.
- **Kindwise policies** on using customer images for training, and their exact deletion SLA. The privacy and terms pages returned 404 or were not found. The plant.id v3 `is_plant` / `is_healthy` probability fields and any Kindwise LLM "conversation"/chatbot endpoint and its credit price come from my prior knowledge and were not verified this session.
- No independent, peer-reviewed accuracy benchmark of **plant.health** or **crop.health** was found; only vendor figures.
- **Plantix** API price, terms and data handling are unavailable without a sales contact.
- A **toxic-plant ID comparison** (PictureThis 10/17 vs Pl@ntNet 8/17 fully correct) appeared in search, but its source link could not be pinned down, so it is excluded.

## 2. General multimodal LLMs (Claude, GPT, Gemini) for identification, diagnosis and a Turkish care chat

### Takeaway
Published evidence consistently shows zero-shot VLMs well behind specialized classifiers on species and disease ID:
- 12% vs 58% top-1 species error against plant.id.
- Ranario & Earles (2025/26): zero-shot VLMs "not yet suitable as standalone agricultural diagnostic systems".
- LeafBench: >90% on healthy-vs-diseased, but <65% on fine-grained pathogen ID.

So use LLMs to explain grounded results and to run the chat, not as the classifier. Per-call costs range from about $0.0003 (Haiku 5.5, Gemini Flash-Lite, GPT nano/luna tiers) to about $0.016 (Sonnet 5.5) for an image diagnosis explanation.

### Cited Findings

#### Accuracy versus specialized models
- **Ranario & Earles, arXiv:2512.15977** (Dec 2025, v3 May 2026): 27 AgML datasets, 162 classes, about 248k images, against a supervised YOLO11 baseline.
  - Zero-shot VLMs "substantially underperform" on every task.
  - Gemini-3 Pro, the best VLM, reached about 62% with multiple-choice prompting. Open-ended prompting usually stayed under 25%; LLM-based semantic judging lifted top models from about 21% to about 30%.
  - Pest/damage ID was the hardest category; species ID the easiest.
  - The authors recommend "constrained interfaces, explicit label ontologies". — [arXiv](https://arxiv.org/abs/2512.15977)
- **LeafBench (Feb 2026):** VLMs exceed 90% on binary healthy-vs-diseased, but fine-grained pathogen ID stays below 65%. — [arXiv:2602.13662](https://arxiv.org/html/2602.13662)
- **MIRAGE benchmark** (multi-turn agricultural conversations, not a photo-ID test): GPT-4o about 44.5% on plant ID. Disease ID: Claude 3.7 Sonnet about 41%, GPT-4.1 about 45–46%. — [arXiv:2506.20100](https://arxiv.org/pdf/2506.20100)
- **Fine-tuned GPT-4o** reached 98.12% on PlantVillage apple leaves vs 96.88% for ResNet-50; zero-shot was much worse. PlantVillage is a lab-background dataset, so this does not reflect field photos. — [arXiv:2504.20419](https://arxiv.org/abs/2504.20419)
- **Kindwise vs GPT-4 Turbo:** 12% vs 58% top-1 species error (vendor test, n=50). — [Kindwise blog](https://www.kindwise.com/post/the-plant-identification-battle-gpt-4-vs-plant-id)

#### Pricing (USD per 1M tokens, standard tier)
- **Claude** — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)

  | Model | Input | Cache read | Output | Batch (in / out) |
  |---|---|---|---|---|
  | Opus 5.5 | $4 | $0.20 | $20 | $2 / $10 |
  | Sonnet 5.5 | $2 | $0.10 | $10 | $1 / $5 |
  | Haiku 5.5 (prompts ≤100k tokens) | $0.10 | $0.01 | $0.50 | $0.05 / $0.25 |
  | Haiku 5.5 (prompts >100k tokens) | $0.50 | — | $2.50 | — |
  | Haiku 4.5 | $1 | — | $5 | — |

  - Cache writes cost 1.25x base input (5-minute TTL) or 2x (1-hour TTL).
  - The Batch API is 50% off.
  - US-only inference (`inference_geo`) adds a 1.1x multiplier.
- **OpenAI** — [OpenAI pricing](https://developers.openai.com/api/docs/pricing)

  | Model | Input | Cached input | Output |
  |---|---|---|---|
  | gpt-5.6-sol | $4.00 | $0.40 | $20.00 |
  | gpt-5.6-terra | $2.00 | $0.20 | $12.00 |
  | gpt-5.6-luna | $0.20 | $0.02 | $1.20 |
  | gpt-5.4-mini | $0.75 | $0.075 | $4.50 |
  | gpt-5.4-nano | $0.20 | $0.02 | $1.25 |
  | gpt-5-nano | $0.05 | $0.005 | $0.40 |
  | gpt-4.1-mini | $0.40 | $0.10 | $1.60 |

  - The Batch tier is 50% off.
  - GPT-6 models are listed but were not extracted.
- **Gemini paid tier** — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)

  | Model | Input | Output | Notes |
  |---|---|---|---|
  | gemini-3.8-flash / 3.6-flash | $0.75 | $3.75 | Paid rates scheduled to double from 2027-01-01 |
  | gemini-3.5-flash-lite | $0.30 | $2.50 | |
  | gemini-3.1-flash-lite | $0.25 | $1.50 | |
  | gemini-3.1-pro-preview (≤200k prompt) | $2 | $12 | |
  | gemini-2.5-flash-lite | $0.10 | $0.40 | |

  - The Batch API is 50% off.
  - Free-tier content is used to improve Google's products; paid-tier content is not.

#### Image token costs
- **Claude:** an image costs ⌈w/28⌉×⌈h/28⌉ tokens. Models from Claude 4.7 on accept up to a 2,576 px long edge / 4,784 tokens. A 1000×1000 image is 1,296 tokens, about $5.18 per 1,000 images on Opus 5.5. Images under 200 px or of low quality raise hallucination risk. — [Claude vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- **OpenAI** (current GPT models): ⌈w/32⌉×⌈h/32⌉ patches × a model multiplier (1.2 for the gpt-5.6, gpt-5.5 and gpt-5.4 families). A 1024×1024 image at `detail=high` is 1,229 tokens. `low` detail fits the image within 512×512. — [OpenAI images & vision](https://developers.openai.com/api/docs/guides/images-vision)
- **Gemini 3:** fixed per-image budgets by `media_resolution`: low 280, medium 560, high 1,120 (also the default), ultra_high 2,240. `high` is recommended for image analysis. — [Gemini media resolution](https://ai.google.dev/gemini-api/docs/media-resolution)

#### Privacy and data handling
- Claude API images are "ephemeral and not stored beyond the duration of the API request", and "Anthropic does not use uploaded images to train models". — [Claude vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)

#### Turkish output quality
- **TurkishMMLU** (EMNLP 2024 Findings, 10k+ questions), 5-shot: GPT-4o 83.1, Claude 3 Opus 79.1, GPT-4 Turbo 75.7, Claude 3 Sonnet 67.3, Gemini 1.0 Pro 63.2. These are older model generations. — [arXiv:2407.12402](https://arxiv.org/abs/2407.12402)
- **TrGLUE** (Dec 2025), zero-shot Turkish grammar acceptability (Matthews correlation): Claude 3 Sonnet 0.14, GPT-4 Turbo 0.28, Gemini 1.0 Pro 0.21, Qwen2-72B 0.47. Again older models. — [arXiv:2512.22100](https://arxiv.org/pdf/2512.22100)

#### Structured output
- Claude supports schema-constrained JSON through `output_config.format` (the old `output_format` parameter is deprecated) and `strict: true` tool schemas. Forced `tool_choice` returns a 400 on Opus 5.5 and Sonnet 5.5; use `auto` plus a schema. Source: Anthropic's claude-api SDK reference bundled with Claude Code (cached 2026-10-06); no public URL was fetched.

#### Prompt injection from images
- OWASP LLM01:2025 names multimodal injection, including instructions hidden in images that accompany benign text (Scenario #7). It warns that "it is unclear if there are fool-proof methods of prevention". — [OWASP GenAI](https://genai.owasp.org/llmrisk/llm01/)
- Known techniques: white-on-white text, least-significant-bit encoding, and adversarial noise. VLMs "do not distinguish" between the content a user means to show and instructions embedded in it. — [CSA research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-image-prompt-injection-multimodal-llm-2026/)

### Inferences
- **Grounding pattern:** pass the specialist API's top-k species, scores and health classes into the LLM as structured context. Instruct the model to explain only within those labels, a "constrained label ontology" in Ranario & Earles' terms. Do not let it re-identify from scratch.
- **Confidence thresholds** (to tune on your own data; Kindwise drops suggestions under 1%):
  - Top-1 score ≥ ~0.6: show the species.
  - Score between ~0.2 and ~0.6: show the top 3 as "olası türler" (possible species) and ask for another photo.
  - Score below ~0.2, or `is_plant` / non-plant rejection: "Bitki tanınamadı" (plant not recognized) plus photo tips.
- **Diagnosis fallback:** always attach a "bir uzmana/ziraat mühendisine danışın" (consult an expert / agricultural engineer) line. Pair it with a clear disclaimer for edible crops and pesticide advice, because the specialist APIs disclaim accuracy (Pl@ntNet terms) and the best VLMs still score under 65% on fine-grained pathogen ID.
- **Prompt-injection hardening:**
  - Give vision calls no tools or side effects.
  - Use schema-only output and validate it server-side (Zod/class-validator in NestJS).
  - Never let model output change quotas or account state.
  - Keep user free text out of the system prompt.
- **Turkish quality:** no current-generation benchmark was found. Run a small in-house eval (for example 50 Turkish care questions graded by a native speaker and a botanist) before choosing between Haiku 5.5, gpt-5.6-luna and Gemini Flash-Lite for chat.
- **Gemini 3.8 / 3.6 Flash:** the scheduled 2027 price doubling should be modelled in any 12-month projection.

### Gaps
- No published head-to-head of current models (Claude 5.x, GPT-5.6/6, Gemini 3.x) against Pl@ntNet or plant.id on one shared image set.
- No 2025–2026 Turkish benchmark covering current frontier or small models.
- OpenAI and Gemini policies on retaining and training on API images were not fetched this session, except Gemini's free-vs-paid note.
- GPT-6 family prices were not extracted.

## 3. Recommended architecture patterns (specialist-first, caching, image prep, storage, on-device checks, metering, cost controls)

### Takeaway
1. The client resizes and checks the photo.
2. The backend uploads it to R2.
3. The backend calls the specialist API (Kindwise, or Pl@ntNet for ID), deduplicating by image hash.
4. The species result is mapped to a precomputed Turkish care card.
5. The LLM is called only for diagnosis explanations and chat, grounded on that result, under per-user quotas.

Provider docs set the image sizes: Kindwise 1–2 MP with an ~800 px long side for speed; Claude ~1000 px ≈ 1.3k tokens. Storage on R2 is negligible in cost.

### Cited Findings
- **Kindwise image guidance:** optimal 1–2 MP, never above 2 MP; ~800 px long side for faster responses; up to 5 images per call. — [Kindwise FAQ](https://www.kindwise.com/faq)
- **Pl@ntNet:** up to 5 images and 50 MB total per call; non-plant images rejected unless `no-reject=true`. — [Pl@ntNet identify docs](https://my.plantnet.org/doc/api/identify)
- **Claude:** large images are downscaled automatically, but pre-resizing is advised to cut latency and cost. Heavy or repeated JPEG compression can create artifacts that hurt accuracy. — [Claude vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- **Claude Files API:** upload once and reference by `file_id`, so a multi-turn chat does not resend base64 bytes on every turn. — [Claude vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- **Kindwise retrieval:** results can be fetched later (6 months per handbook, ≥3 months per FAQ), including in other languages, at 0 credits. — [Kindwise handbook](https://www.kindwise.com/handbook); [Kindwise FAQ](https://www.kindwise.com/faq)
- **Caching and batch discounts:**
  - Claude cache reads cost 0.05x base input on Opus 5.5 / Sonnet 5.5 and 0.1x on most other models; the 5-minute cache pays for itself after one read. The Batch API is 50% off and stacks with caching. — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
  - Gemini and OpenAI batch tiers are also 50% off. — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing); [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- **Cloudflare R2:** $0.015/GB-month (Standard), $0.01 (Infrequent Access). Class A operations $4.50/M, Class B $0.36/M. Egress is free. Free tier: 10 GB-month, 1M Class A and 10M Class B operations per month. — [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- **Pl@ntNet responses** include `remainingIdentificationRequests`, which is useful for quota alerts. — [Pl@ntNet identify docs](https://my.plantnet.org/doc/api/identify)

### Inferences
- **Pipeline (NestJS):**
  1. The Expo client checks the photo on device:
     - blur (variance-of-Laplacian or similar, via a native module or expo-image-manipulator plus a JS heuristic)
     - minimum resolution (Claude warns about images under 200 px)
     - optionally an on-device "is plant" classifier (TFLite/ML Kit)
     It then resizes to about 1024–1280 px long edge, JPEG quality ~80, and strips EXIF/GPS (GPS stripping is a privacy measure).
  2. The client uploads with a presigned R2 PUT URL issued by the backend.
  3. A BullMQ (Redis) job sends the R2 URL or bytes to the specialist API.
  4. Results go into a Prisma `Identification` row.
  5. The species maps to a `Species` / `CareCard` table.
  6. The LLM is called only if the user opens a diagnosis or the chat.
- **Dedup and caching:**
  - Hash the uploaded image (SHA-256 plus a perceptual hash) to skip re-identifying identical retries.
  - Cache care cards per accepted species name (WCVP/POWO ID). Generate Turkish care text once per species with a batch LLM run, not per scan.
  - Put the static system prompt and care card first in the LLM request so they can be prompt-cached.
- **Metering:**
  - A `UsageEvent` table: userId, kind (ID / HEALTH / CHAT_TURN), provider, credits or tokens, costMicros, createdAt.
  - A monthly counter enforced in a NestJS guard before the provider is called. Use a Redis `INCR` with an expiry for speed and reconcile to Postgres.
  - Store the provider's `usage` fields (input/output/cache tokens) for exact per-user cost.
- **Cost controls:**
  - Hard caps on free plans (for example 3 IDs + 1 diagnosis + 10 chat turns per month).
  - `max_tokens` caps and low effort on chat.
  - A Haiku-class model by default, escalating to Sonnet-class only for diagnosis explanations or premium users.
  - Kill switches per provider.
  - Daily spend alerts.
  - Fallback ordering (for example Pl@ntNet, then Kindwise) on outage.
- **Retention:**
  - Keep originals 30–90 days, then delete them or move them to Infrequent Access.
  - Keep thumbnails for the user's history.
  - Configure Kindwise identification deletion (0 credits) after storing results locally, to limit third-party retention.

### Gaps
- No engineering write-ups from production plant apps describing their pipelines were found.
- On-device blur and plant classifier accuracy and latency on Expo were not researched.
- S3 pricing was not fetched, for comparison with R2.

## 4. Plant knowledge data for care cards (GBIF, POWO/Kew, Wikidata, USDA, Trefle/Perenual) and Turkish names and pet-toxicity sources

### Takeaway
The commercially reusable backbone is:
- WCVP/POWO for taxonomy (CC BY on GBIF)
- GBIF, filtered to CC0/CC BY records
- Wikidata for multilingual and Turkish labels (CC0)
- Perenual if you want a paid, commercial-use care API ($59.99/mo or $139.99/mo)

There is no open, licensed Turkish common-name or ASPCA toxicity dataset confirmed. Bizim Bitkiler and ASPCA publish no reuse licence, so get permission or write the content yourself.

### Cited Findings
- **GBIF licensing policy:** datasets are published under CC0, CC BY or CC BY-NC. CC0 and CC BY allow commercial use; CC BY-NC does not. 83% of publishers chose CC BY and 5% CC0. GBIF acknowledges grey areas in what counts as "commercial". — [GBIF IPT manual](https://ipt.gbif.org/manual/en/ipt/2.5/applying-license); [GBIF news](https://www.gbif.org/news/82812)
- **WCVP (Kew):** listed on GBIF as CC BY 4.0 (DOI 10.15468/6h8ucr). The Kew repository record for Version 10 says CC BY 3.0. Catalogue of Life lists version 13.0 (2024-05-16); an unofficial R package tracks v15 (Jan 2026). — [Catalogue of Life](https://www.catalogueoflife.org/data/dataset/2232); [Kew repository](https://kew.iro.bl.uk/concern/datasets/e9cc7e79-9ad3-40bb-ac8f-d04b4b0ed417); [wcvpdata manual](https://paulesantos.r-universe.dev/wcvpdata/doc/manual.html)
- **Pl@ntNet** returns POWO and GBIF IDs, which makes joining to WCVP/POWO and GBIF straightforward. — [Pl@ntNet identify docs](https://my.plantnet.org/doc/api/identify)
- **Kindwise plant.id** returns GBIF and iNaturalist IDs. — [Kindwise plant.id](https://www.kindwise.com/plant-id)
- **Wikidata:** main-namespace structured data is CC0 ("released into the public domain under Creative Commons Zero"). — [Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)
- **Perenual plans:**

  | Plan | Price | Requests/day | Species | Diseases | Commercial use |
  |---|---|---|---|---|---|
  | Personal | Free | 100 | 1–3,000 | 1–100 | Not stated |
  | Premium | $59.99/mo | 10,000 | Basic data 10,000+; care guides 1–3,000 | 100+ | Yes |
  | Supreme | $139.99/mo | 100,000 | Basic + "xData" 10,000+ | 100+ | Yes |
  | Enterprise | Custom | Custom | — | — | — |

  Licence and attribution terms were not shown on the page. — [Perenual pricing](https://perenual.com/subscription-api-pricing)
- **Trefle:** an open-source REST plant API (AGPL-3.0). Aggregators give conflicting last-activity dates (2023 vs April 2026), so its maintenance status is unclear. — [gittrend](https://gittrend.io/repo/treflehq/trefle-api)
- **Turkish names, Bizim Bitkiler** ("Türkiye Bitkileri Listesi", Nezahat Gökyiğit Botanik Bahçesi): covers vascular plants, lichens, bryophytes, algae and fungi. It has a taxonomy browser, synonyms and distribution maps. No API, download or reuse licence was found. — [bizimbitkiler.org.tr](https://bizimbitkiler.org.tr)
- A journal article criticises how Turkish names were assigned in Türkiye Bitkileri Listesi, saying the method was unclear. — [EJATD](https://www.anadiliegitimi.com/tr/pub/ejatd/issue/5151/70138)
- **Other Turkish references:**
  - Turhan Baytop, *Türkçe Bitki Adları Sözlüğü* (TDK, 3rd ed. 2007): the standard print dictionary. — [Manas e-lib](https://elib.manas.edu.kg/book/1042-Turkce_Bitki_Adlari_Sozlugu.pdf)
  - *Resimli Türkiye Florası* (ANG Vakfı) plans about 12,000 species across 30 volumes. — [AA](https://www.aa.com.tr/tr/gundem/resimli-turkiye-florasi-projesi-bitkilerin-turkce-isimleriyle-taninmasina-katki-sunacak/2742639)
- **ASPCA:** separate toxic and non-toxic lists for dogs, cats and horses. The ASPCA describes them as "not meant to be all-inclusive". No licence or reuse terms were found, and the terms-of-use URL returned 404. — [ASPCA toxic plants](https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants)

### Inferences
- **Care cards:**
  - Build a `Species` table keyed by WCVP/POWO ID, with GBIF ID and Wikidata QID.
  - Pull Turkish labels from Wikidata (CC0) where they exist.
  - Fill gaps with the Turkish names Kindwise or Pl@ntNet return (check their licence terms on reuse).
  - Have a botanist curate the top ~500 houseplants, which cover most consumer scans.
  - Write care text yourself, LLM-drafted and expert-reviewed, rather than copying Perenual or ASPCA content you have not licensed.
- **Toxicity flags:** treat as curated facts, not LLM output. Link to ASPCA as a reference rather than redistributing its lists. Ask ASPCA for written permission if you want to import the data.

### Gaps
- USDA PLANTS licensing/API and POWO site terms: POWO returned 403; USDA was not researched.
- Wikidata coverage of Turkish common names (property P1843) for houseplants was not measured.
- No openly licensed pet-toxicity dataset was found (for example under CC BY or CC0).
- GBIF vernacular-name API coverage for Turkish was not checked; the GBIF terms page returned 403.

## 5. Rough monthly cost model at 10k and 50k MAU (with data-residency and KVKK notes)

### Takeaway
**ESTIMATE**, base usage of 4 ID scans + 1 health diagnosis + 10 chat turns per MAU per month:

| Architecture | 10k MAU | 50k MAU |
|---|---|---|
| A. Kindwise ID + health, Sonnet 5.5 diagnosis text, Haiku 5.5 chat | ~€1,000 + ~$200/mo | ~€3,750 + ~$1,000/mo |
| B. Pl@ntNet ID + Kindwise health + Haiku 5.5 | ~€500 + ~$50 | ~€2,000 + ~$230 |
| C. Gemini Flash only (lower accuracy) | ~$390 | ~$1,950 |

In architecture A the specialist-API credits dominate. LLM chat on Haiku-class models is cheap; Sonnet-class chat adds about $730 (10k MAU) or $3,650 (50k MAU) per month. Storage is negligible.

### Cited Findings
- **Unit prices behind the model:**
  - Kindwise credits by volume. — [Kindwise pricing](https://www.kindwise.com/pricing)
  - Health assessment credit rules. — [plant.id v3 Postman docs](https://documenter.gw.postman.com/view/metadata/2s93z5A4v2)
  - Pl@ntNet Pro and the 500/day free tier. — [Pl@ntNet pricing](https://my.plantnet.org/pricing); [Pl@ntNet terms](https://my.plantnet.org/terms_of_use)
  - Claude, OpenAI and Gemini token prices, as in section 2. — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing); [OpenAI pricing](https://developers.openai.com/api/docs/pricing); [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
  - Image token formulas, as in section 2. — [Claude vision](https://platform.claude.com/docs/en/build-with-claude/vision); [OpenAI vision](https://developers.openai.com/api/docs/guides/images-vision); [Gemini media resolution](https://ai.google.dev/gemini-api/docs/media-resolution)
  - R2 prices. — [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- **Data residency:**
  - Pl@ntNet is "European hosted" and does not store photos. — [Pl@ntNet pricing](https://my.plantnet.org/pricing); [Pl@ntNet terms](https://my.plantnet.org/terms_of_use)
  - Kindwise uses Google Cloud Storage and DigitalOcean, with a Central Europe data centre. — [Kindwise FAQ](https://www.kindwise.com/faq)
  - Claude's default is global routing; US-only inference costs 1.1x. — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
  - Gemini free-tier data is used to improve Google's products. — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- **KVKK (Turkey's data-protection law, No. 6698):**
  - Article 9 was amended by Law 7499, effective 1 June 2024. Cross-border transfers now rely on an adequacy decision, then appropriate safeguards (standard contracts, binding corporate rules), then narrow occasional exceptions. Explicit consent is largely limited to occasional transfers.
  - The implementing regulation was published on 10 July 2024.
  - Standard contracts must be notified to the Authority within 5 business days; an online notification module launched under Board decision 2024/1793.
  - One source puts the 2026 fine range for not notifying at 90,308 TL–1,806,377 TL.
  - — [EY Türkiye](https://www.ey.com/tr_tr/insights/law/kvkk-degisikliginin-yurt-disi-veri-aktarimina-etkisi); [alomaliye](https://www.alomaliye.com/2024/10/30/kvkk-standart-sozlesme-bildirim-modulu/); [Erdem & Erdem](https://www.erdem-erdem.av.tr/bilgi-bankasi/kisisel-verilerin-korunmasi-kanununda-neler-degisti)

### Inferences
All figures below are **ESTIMATES**, mine, not provider quotes.

#### Assumptions
- **Usage per MAU per month (blended free + premium):** 4 ID scans, 1 health diagnosis, 10 chat turns. That is 40k / 10k / 100k at 10k MAU and 200k / 50k / 500k at 50k MAU. Costs scale linearly with these, so halve them if free-tier caps bite.
- **Kindwise buying pattern:** credits bought quarterly because of the 3-month validity.
  - 10k MAU: 50k credits/month = 150k/quarter → €0.02 tier.
  - 50k MAU: 250k/month = 750k/quarter → €0.015 tier.
- **Diagnosis LLM call:** about 3,400 input tokens (≈1.3k image tokens at ~1000 px, plus ~2.1k system prompt and grounding JSON) and about 900 output tokens (Turkish JSON plus thinking, low effort).

  | Model | Cost per diagnosis call |
  |---|---|
  | Sonnet 5.5 | $0.0158 |
  | gpt-5.4-mini | $0.0065 |
  | Gemini 3.8 Flash (image 1,120 tokens) | $0.0058 |
  | Haiku 5.5 | $0.0008 |

- **Chat turn:** about 2,000 cached tokens (system prompt + care card), about 1,550 uncached tokens (history + question), about 400 output tokens.

  | Model | Cost per chat turn |
  |---|---|
  | Sonnet 5.5 | $0.0073 |
  | Gemini 3.1 Flash-Lite | ~$0.0010 |
  | gpt-5.4-nano | ~$0.00085 |
  | Haiku 5.5 | $0.00038 |

  Cache-write premiums and longer histories would raise these by about 10–30%.
- **Per-image input cost alone** (~1000 px): Sonnet 5.5 ≈ $0.0026, Haiku 5.5 ≈ $0.00013, Gemini 3 Flash ≈ $0.00084, gpt-5.4-mini ≈ $0.00092.

#### 10k MAU / month
| Architecture | Specialist APIs | LLM | Total |
|---|---|---|---|
| A. Kindwise plant.id + plant.health; Sonnet 5.5 diagnosis text; Haiku 5.5 chat | 50k credits × €0.02 = **€1,000** | diagnosis 10k × $0.016 = $160; chat 100k × $0.00038 = $38 | **≈ €1,000 + $200** (≈ €0.10 + $0.02 per MAU) |
| A′. Same, but Sonnet 5.5 chat | €1,000 | $160 + $730 | ≈ €1,000 + $890 |
| B. Pl@ntNet Pro ID + Kindwise plant.health only + Haiku 5.5 for diagnosis text and chat | Pl@ntNet 480k/yr × €0.005 = €2,400/yr = **€200**; Kindwise 10k/month (30k/quarter at €0.03) = **€300** | $8 + $38 | **≈ €500 + $46** |
| C. LLM-only: Gemini 3.8 Flash for ID + diagnosis, 3.1 Flash-Lite for chat | — | 50k × $0.0058 = $290; 100k × $0.0010 = $100 | **≈ $390**; ≈ $680 after the 2027 Flash price doubling |

#### 50k MAU / month
| Architecture | Specialist APIs | LLM | Total |
|---|---|---|---|
| A | 250k credits × €0.015 = **€3,750** (about €2,500 at the €0.01 tier if 1.5M+ credits are bought, but 3-month expiry makes that risky) | $800 + $190 | **≈ €3,750 + $990** |
| A′ (Sonnet chat) | €3,750 | $800 + $3,650 | ≈ €3,750 + $4,450 |
| B | Pl@ntNet 2.4M/yr × €0.005 = **€1,000**; Kindwise 50k/month (150k/quarter at €0.02) = **€1,000** | $40 + $190 | **≈ €2,000 + $230** |
| C | — | $1,450 + $500 | **≈ $1,950**; ≈ $3,400 after the 2027 Flash doubling |

#### Other cost lines
- **One-time care-card generation:** about 3,000 species × (1.5k input + 1.5k output tokens) on the Sonnet 5.5 Batch API ($1/$5) ≈ $27. Re-run per locale or per revision.
- **Storage:** 50k images/month × ~250 KB ≈ 12.5 GB/month, so ~150 GB after a year ≈ $2.25/month on R2 plus about $0.25 in Class A operations. 5x that at 50k MAU is still under ~$15/month. Egress is free.
- **Early stage:** the 100 Kindwise trial credits are only enough for testing. Pl@ntNet's 500/day free tier (~15k/month) covers ID for roughly the first 3–4k MAU, if commercial use under 500/day is confirmed. Kindwise at €0.05/credit for the first 1k–10k credits makes early diagnosis about €50–€300/month.
- **Currency:** the EUR lines dominate options A and B. I did not look up an exchange rate; the report writer should apply a current EUR/USD (or EUR/TRY) rate.
- **Savings levers:**
  - Dedup retries.
  - Use `health=auto` only when the user asks "what's wrong?".
  - Cap free users.
  - Precompute care text.
  - Default chat to Haiku-class models.
  - Batch API for offline work.
  - Use Kindwise's reduced-class discount if you only need houseplants. The size of that discount is unknown; ask Kindwise sales.
- **KVKK and residency:**
  - Photos may contain people or location metadata, so strip EXIF on device.
  - Before go-live, list each foreign processor: Kindwise (EU, on GCS/DigitalOcean), Pl@ntNet (EU), the LLM provider (US/global) and Cloudflare.
  - Sign and notify KVKK standard contracts with each.
  - Use paid LLM tiers only, never Gemini's free tier, so that user content is not used for training.

### Gaps
- Real usage ratios (scans, diagnoses and chat turns per MAU) for consumer plant apps were not found. The 4 / 1 / 10 assumption should be replaced with analytics from a beta.
- Whether Kindwise's "valid for 3 months" exception for purchases under 30,000 credits means small packs never expire. Ask Kindwise.
- Kindwise's EU-specific hosting regions, sub-processor list and DPA were not retrieved. Whether Kindwise and Pl@ntNet have signed KVKK standard contracts with Turkish customers is unknown.
- No current EUR/USD/TRY rate was fetched.
