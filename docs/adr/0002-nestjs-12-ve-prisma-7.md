# ADR 0002: NestJS 12 + Prisma 7.10 (1. hafta spike sonuçları)

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026

## Bağlam

Rapor, NestJS 12 ve Prisma 7.10'u önerdi ve açık bir soru bıraktı: ESM-only Prisma 7 istemcisi CommonJS bir NestJS uygulamasında çalışır mı? 1. haftanın spike'ı bunu ve kurulumun geri kalanını denedi.

## Karar

| Bileşen | Sürüm | Not |
|---|---|---|
| NestJS | `@nestjs/core` ^12.0.1, CLI 12.0.10 | `nest new` artık ESM proje üretiyor (`"type": "module"`), TypeScript 6, vitest 4, oxlint |
| Prisma | `prisma`, `@prisma/client`, `@prisma/adapter-pg` **7.10.1, tam sabit** | `^` yok; npm `latest` etiketi 8.0.0-rc.27 |
| Veritabanı | PostgreSQL 15 (yerelde Homebrew) | `everbloom_dev`, e2e için `everbloom_test` |
| Node | Yerelde 20.20.2 | Hem NestJS 12 hem Prisma 7.10 Node 20.19+ kabul ediyor; prod için Node 22 LTS |

Spike'ın kanıtladıkları:

- **ESM/CJS sorunu yok.** NestJS 12 ve Prisma 7'nin `prisma-client` üreticisi ikisi de ESM. `src/generated/prisma/client.ts` doğrudan içe aktarılıyor; `nest build` ve `node dist/main.js` çalışıyor.
- **DI vitest altında çalışıyor.** Vite 8'in dönüştürücüsü decorator metadata'yı destekliyor; ek SWC eklentisine gerek kalmadı.
- `GET /health` Prisma üzerinden `SELECT 1` çalıştırıyor ve `{status, db, dbLatencyMs, prisma: "7.10.1"}` döndürüyor.
- `GET /api/categories` veritabanından eski sözleşmeye uygun çıplak dizi döndürüyor ve `@everbloom/contract` şemasıyla doğrulanıyor.

## Karşılaşılan tuzaklar

1. **Prisma 8 RC uyarısı.** Her `migrate dev` "7.10.1 → 8.0.0-rc.27 güncellemesi var" diyor. Rapordaki uyarı doğru: güncelleme önerisine uyulmamalı, sürümler tam sabit kalmalı.
2. **Yapılandırma dosyasının adı `prisma7.config.ts`.** `prisma init` 7.10'da bu adı üretiyor ve CLI onu otomatik buluyor. Dosya yeniden adlandırılmadı.
3. **`prisma init` yapay zekâ "skill" klasörleri indiriyor.** `.agents/`, `.claude/`, `.windsurf/` ve `skills-lock.json` oluşturdu (GitHub `prisma/skills`). Bunlar istenmediği için silindi. Yeni bir `prisma init` çalıştırılırsa tekrar kontrol edilmeli.
4. **Kullanıcı adı olmayan bağlantı adresi.** `pg` sürücüsü `postgresql://localhost/...` adresinde işletim sistemi kullanıcısını varsayıyor, Prisma'nın şema motoru ise P1010 hatası veriyor. `.env` içinde kullanıcı adı açıkça yazılmalı.
5. **`migrate reset` yapay zekâ ajanlarına kapalı.** Prisma 7.10, `migrate reset --force` komutunun bir ajandan geldiğini algılayınca kullanıcının açık onayını istiyor. e2e kurulumu bu yüzden yıkıcı olmayan `migrate deploy` ile upsert tabanlı seed kullanıyor. Testler veri silmiyor.
6. **Port 3000 dolu.** Makinede başka bir Next.js uygulaması 3000'de, başka bir süreç 4000'de çalışıyor. API 4100'de, mock 4010'da.
7. **Görsel adresleri göreli tutuluyordu.** 2. haftada çözüldü: veritabanı nesne anahtarı tutuyor, API URL'yi `ASSET_BASE_URL` ile üretiyor ([ADR 0006](0006-sema-v1-ve-katalog.md)).

## Sonuçlar

- `@everbloom/contract` API'nin çalışma zamanı bağımlılığı değil. Yalnızca testler (vitest) ve seed (tsx) onu içe aktarıyor. API kendi eşleyicilerini (`src/catalog/legacy.mapper.ts`) yazıyor.
- Şema v1, katalog uçları ve snapshot sözleşme testleri 2. haftada bu iskeletin üzerine kuruldu ([ADR 0006](0006-sema-v1-ve-katalog.md)).
