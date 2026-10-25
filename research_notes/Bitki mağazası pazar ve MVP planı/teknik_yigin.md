# Teknik Yığın ve Mimari: Node.js + Prisma e-ticaret MVP backend + web admin paneli (Ekim 2026)

> Research date: 2026-10-25. All package versions below come from the npm registry (registry.npmjs.org), queried on 2026-10-25. GitHub activity comes from the GitHub REST API on the same day. Opinion and vendor-marketing sources are labelled as such. Local frontend facts come from reading the existing Expo app source in this workspace.

## Framework: NestJS vs Fastify vs Express vs Hono for a 1-2 person team building a REST e-commerce API with Prisma

### Takeaway
All four are actively maintained in Oct 2026. The two practical choices are **NestJS 12** (batteries included: modules/DI, guards for admin vs customer RBAC, official Swagger/JWT/throttler packages, a structure that looks like Laravel's controller/request/service pattern) and **Fastify 5 + Zod type provider** (lighter, zod-first, request schemas produce OpenAPI). For a CRUD-heavy MVP with an admin API, NestJS 12 is the lower-decision-cost default. One caveat: NestJS 12 shipped on 2026-08-27, so some community add-ons (nestjs-zod, nestjs-prisma) don't yet declare support for it.

### Cited Findings
- **Versions verified (npm, 2026-10-25):**
  - `@nestjs/core` 12.2.0 (2026-10-19). First 12.0.0 was 2026-08-27. 11.x is now tagged `legacy` (11.2.8). [npm @nestjs/core](https://www.npmjs.com/package/@nestjs/core)
  - `fastify` 5.12.7 (2026-10-13). 5.0.0 was 2024-09-17. `next` tag is 6.0.0-alpha.5, so Fastify 6 is still alpha. [npm fastify](https://www.npmjs.com/package/fastify)
  - `express` 5.3.0 (2026-10-09). 5.0.0 was 2024-09-10. `latest-4` is 4.22.3. [npm express](https://www.npmjs.com/package/express)
  - `hono` 4.13.14 (2026-10-25). [npm hono](https://www.npmjs.com/package/hono)
- **Activity (GitHub API, 2026-10-25):**
  - nestjs/nest: 76.9k stars, pushed 2026-10-25, 36 open issues. [GitHub nestjs/nest](https://github.com/nestjs/nest)
  - honojs/hono: 32.7k stars, pushed 2026-10-25, 402 open issues. [GitHub honojs/hono](https://github.com/honojs/hono)
- **NestJS 12 changes:**
  - Requires Node.js 20.19+ or 22.12+.
  - Core packages now ship as ESM, but existing CommonJS apps can keep using `require()`.
  - Deep imports into `@nestjs/config` and `@nestjs/swagger` internals no longer resolve.
  - `@nestjs/config` now uses Standard Schema instead of Joi-specific code.
  - New projects default to Vitest and oxlint.
  - `nest upgrade` (with `--dry-run`) automates the mechanical migration.
  - Sources: [newreleases: nestjs v12.0.0](https://newreleases.io/project/github/nestjs/nest/release/v12.0.0); [newreleases: @nestjs/config 12.0.0](https://newreleases.io/project/npm/@nestjs/config/release/12.0.0); [InfoQ NestJS 12 roadmap (April 2026, described v12 as a draft at the time)](https://infoq.com/news/2026/04/nestjs-12-roadmap-esm)
- **NestJS 12 ecosystem compatibility (peerDependencies on npm, 2026-10-25):**
  - Ready for v12: `@nestjs/swagger` 12.0.4 (peers `@nestjs/core ^12`, `class-validator`, `class-transformer`), `@nestjs/throttler` 6.7.1 (peers include `^12.0.0`), `@nestjs/jwt` 12.0.3, `@nestjs/passport` 12.0.0, `@nestjs/platform-fastify` 12.2.0. [npm @nestjs/swagger](https://www.npmjs.com/package/@nestjs/swagger); [npm @nestjs/throttler](https://www.npmjs.com/package/@nestjs/throttler)
  - **Not yet declaring v12:** `nestjs-zod` 5.5.0 peers `@nestjs/common ^10 || ^11` and `@nestjs/swagger` up to `^11`. [npm nestjs-zod](https://www.npmjs.com/package/nestjs-zod)
  - **Not yet declaring v12:** `nestjs-prisma` 0.27.0 peers `@nestjs/common` up to `^11` (Prisma up to `^7`). [npm nestjs-prisma](https://www.npmjs.com/package/nestjs-prisma)
- **Fastify zod tooling:**
  - `@fastify/type-provider-zod` 1.0.1 (official `@fastify` scope; peers `zod >=4.2.0`, `fastify ^5.5.0`, `@fastify/swagger >=9.5.1`). [npm @fastify/type-provider-zod](https://www.npmjs.com/package/@fastify/type-provider-zod)
  - The community `fastify-type-provider-zod` is at 7.0.0. [npm fastify-type-provider-zod](https://www.npmjs.com/package/fastify-type-provider-zod)
  - `@fastify/swagger` is 9.9.2. [npm @fastify/swagger](https://www.npmjs.com/package/@fastify/swagger)
- **Hono:** `@hono/zod-openapi` 1.6.3 peers `zod ^4.0.0` and `hono >=4.10.0`, and builds on `@asteasolutions/zod-to-openapi`. [npm @hono/zod-openapi](https://www.npmjs.com/package/@hono/zod-openapi)
- **Opinion (vendor/blog sources, 2026):**
  - NestJS is the "heavyweight, opinionated" option (architecture, DI, enterprise patterns). [Encore: NestJS vs Fastify vs Hono](https://encore.dev/articles/nestjs-vs-fastify-vs-hono) (Encore sells a competing framework, so it is biased)
  - Fastify is positioned as an Express replacement with built-in JSON-schema validation and claimed ~2-3x throughput (unverified). [Encore](https://encore.dev/articles/nestjs-vs-fastify-vs-hono)
  - Hono is positioned as edge/serverless-first. [Encore](https://encore.dev/articles/nestjs-vs-fastify-vs-hono)
  - A European consultancy says NestJS "delivers structure and long-term maintainability but can weigh down MVPs and small teams". [Edana: alternatives to NestJS (2026-03-29)](https://edana.ch/en/2026/03/29/alternatives-to-nestjs-the-complete-guide-to-choosing-the-right-backend-framework/)
  - A 2026 benchmark roundup says Express remains the default for small APIs because of its ecosystem and hiring pool, and gives a throughput gap headline of "100K vs 53K req/s". [tech-insider.org](https://tech-insider.org/?p=22176) (benchmark not independently verified)
- **NestJS POST status code:** NestJS returns 200 by default except for POST, which returns 201, unless you use `@HttpCode()`. [NestJS docs: Controllers](https://docs.nestjs.com/controllers) (well-known documented behavior; not re-fetched in this session)

### Inferences
- **Recommendation (opinion):** NestJS 12 on Node 22 LTS (22.18+), Express adapter (default), with these choices:
  - class-validator + class-transformer DTOs, because those are what `@nestjs/swagger` 12 peers today, and they generate OpenAPI with no extra library.
  - `@nestjs/jwt` + guards for RBAC.
  - `@nestjs/throttler` for OTP and login rate limits.
  - A hand-written ~20-line `PrismaService` instead of `nestjs-prisma`.
  - Switch to the Fastify adapter only if profiling shows a need, since throughput won't be the bottleneck at MVP scale.
- **Why NestJS for this team:** the CLI scaffolding (`nest g resource`) suits ~24 public plus ~30-40 admin CRUD endpoints. Guards and interceptors give one place for auth, response shaping and error formats, and the conventions reduce architecture debates for 1-2 developers. The previous backend looks Laravel-style (`/api/...` paths, port 8000, snake_case `expires_at`), and NestJS controller/DTO/service maps closely to Laravel controller/FormRequest/service.
- **Alternative if the team prefers minimalism and one schema language across backend, admin and the RN app:** Fastify 5 + `@fastify/type-provider-zod` + `@fastify/swagger`. It is faster to start, but you must assemble auth, RBAC and module structure yourself.
- **Express 5:** workable but needs the most assembly (validation, OpenAPI, structure).
- **Hono:** great DX, but its edge focus brings no benefit for a VPS/PaaS Node server with Prisma + Postgres.
- **NestJS gotcha:** the existing frontend checks `response.status === 200` after POSTs (see the API contracts section), so every legacy-compatible POST route needs `@HttpCode(200)`.
- If the team wants Zod in NestJS 12 now, `nestjs-zod` will install with peer-dependency warnings until it declares v12 support. Treat that as risk, or use plain zod pipes.

### Gaps
- No independent, reproducible 2026 benchmark found; the throughput figures are vendor/blog claims.
- I did not open the full NestJS 12 migration guide, so other breaking changes may exist. This matters little for a greenfield project.
- Not verified: whether Prisma 7's ESM-only client works smoothly in a CommonJS NestJS 12 app, or whether to go full ESM. The Prisma 7 `prisma-client` generator may offer a CJS module-format option, but I didn't confirm it. A 1-day spike in week 1 is advisable.

## Prisma as of late 2026: current major version, notable changes and e-commerce gotchas

### Takeaway
**Prisma ORM 7 (7.10.1) is the stable production line. Prisma ORM 8 is still a release candidate (8.0.0-rc.27), yet npm's `latest` tag for the `prisma` CLI already points to 8.** A fresh `npm install prisma` gives an RC CLI that can't run `generate` / `migrate dev` on a v7 project. Pin `prisma@^7` and `@prisma/client@^7` for this MVP. Prisma 8 RC lacks features an e-commerce backend needs: `$extends`, atomic `increment`, most nested writes, isolation levels, and P2002-style errors.

### Cited Findings
- **npm dist-tags (2026-10-25):**
  - `prisma`: `latest` = 8.0.0-rc.27, `prev` = 7.10.1. The first 8.x RC was published 2026-08-17.
  - `@prisma/client`: `latest` = 7.10.1 (2026-10-15).
  - `@prisma/adapter-pg`: 7.10.1.
  - Prisma 7.0.0 shipped 2025-11-19.
  - [npm prisma](https://www.npmjs.com/package/prisma); [npm @prisma/client](https://www.npmjs.com/package/@prisma/client)
- **Release status (official):**
  - "Prisma ORM 8 is a release candidate", with GA "expected in October 2026".
  - v8 requires Node.js 22.18+ / 24.11+ / 26+ and TypeScript 5.9+.
  - Not yet in v8: `$extends`, filtering inside JSON columns, atomic `increment`, most nested writes, transaction isolation levels, and `P2002`-style error codes.
  - v7 gets bug fixes and security updates for 18 months after v8 GA. v6 gets security patches only, until 19 Nov 2026.
  - `npm install prisma` now installs the v8 CLI, which doesn't read `schema.prisma` and lacks `generate`, `migrate dev` and `db push`. v7 projects should pin `"prisma": "^7"` and `"@prisma/client": "^7"` and use `npx prisma@7` in CI.
  - [Prisma docs: Release status](https://www.prisma.io/docs/orm/release-status)
- **Prisma changelog 2026-10-02:**
  - Prisma 8 is "what `prisma@latest` installs"; v7 is now `prisma@prev`.
  - The v8 RC can read an existing v7 PostgreSQL `schema.prisma`.
  - Advice: check CI scripts that install `prisma@latest`.
  - [Prisma changelog 2026-10-02](https://www.prisma.io/changelog/2026-10-02)
- **Prisma 8 RC churn:** later RCs changed schema syntax. Every schema file needs a `// use prisma-8` header, `dbgenerated()` is replaced by `sql` tagged literals, and models without `@@map` use their name as written for the table. RCs "may remove or rename APIs". [Web search summary of Prisma release notes (gitclear/newreleases mirrors)](https://www.gitclear.com/open_repos/prisma/prisma/release/v8.0.0-rc.12) (secondary mirror; treat details as indicative)
- **Prisma 7 breaking changes (official upgrade guide):**
  - Minimum Node 20.19.0 and TypeScript 5.4.0.
  - Ships as ESM (set `"type": "module"`).
  - New `prisma-client` generator with the "Rust-free" client. The generator `output` is required, and the client is no longer generated into `node_modules`.
  - **A driver adapter is required for all databases** (e.g. `@prisma/adapter-pg`).
  - `prisma.config.ts` is the default place for the DB URL, schema location, migrations and seed. `url` / `directUrl` / `shadowDatabaseUrl` in the `datasource` block are deprecated.
  - Env vars are **not** loaded automatically (use dotenv).
  - The `$use` middleware is removed (use Client Extensions).
  - The Metrics preview is removed.
  - `migrate dev` no longer runs seed or `generate` automatically.
  - Because v7 uses node-pg, invalid SSL certificates are no longer ignored (error P1010).
  - `pg` pool connection timeout now defaults to 0 (v6 used 5s).
  - MongoDB is not supported on v7.
  - [Prisma docs: Upgrade to Prisma ORM 7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- **Prisma Postgres / Accelerate:**
  - Standalone Accelerate and `accelerate.prisma-data.net` connections retire on **1 Dec 2026**, with no replacement for `cacheStrategy` query caching.
  - Early Access Prisma Postgres DBs (PG16) are deleted on **1 Nov 2026**.
  - On regular Node servers, pooled TCP is recommended over the serverless driver.
  - The Free plan has 200,000 operations.
  - [Prisma changelog 2026-10-02](https://www.prisma.io/changelog/2026-10-02); [Upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- **Transactions in v7:**
  - Interactive `$transaction(async tx => ...)` defaults: `maxWait` 2000 ms, `timeout` 5000 ms.
  - `isolationLevel` is supported; PostgreSQL defaults to ReadCommitted. Docs recommend Serializable plus retry on P2034 to avoid write conflicts.
  - `increment` / `decrement` are used in a transfer example that throws (rolls back) if the balance goes negative.
  - Optimistic concurrency pattern: a `version` Int field plus `updateMany({ where: { id, version } })`; check `count === 0`.
  - Keep transactions short and avoid network calls inside them.
  - [Prisma v7 docs: Transactions](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)
- **Transactions in the v8 docs (now the default docs path):**
  - `db.transaction(cb)` has no isolationLevel/timeout/maxWait options and no array form.
  - Prisma "does not retry write conflicts for you".
  - Send side effects such as emails after commit, because "Database writes roll back; emails don't".
  - [Prisma docs (v8): Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- **Soft delete:** with `$use` removed in v7, soft delete must use Client Extensions. [Upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) `prisma-extension-soft-delete` 2.0.1 was last published 2025-02-22 with peer `@prisma/client: *`, so v7 compatibility is undeclared. [npm prisma-extension-soft-delete](https://www.npmjs.com/package/prisma-extension-soft-delete)
- **Money:** PayTR expresses amounts ×100, e.g. 34.56 → 3456 (kuruş). [PayTR iFrame API step 2](https://dev.paytr.com/en/iframe-api/iframe-api-2-adim)

### Inferences
- **Pin exactly:** `prisma@7.10.x` (devDependency), `@prisma/client@7.10.x`, `@prisma/adapter-pg@7.10.x`, `pg`. Use `npx prisma@7` in CI and the Dockerfile.
- Don't adopt Prisma 8 during this MVP. v7 support runs at least 18 months past v8 GA (into 2028), and v8's missing `$extends`, atomic increment and nested writes would hurt order creation (create order plus order items in one nested write; decrement stock atomically) and unique-constraint handling (duplicate email registration).
- **Money modelling:** store prices as `Int` in kuruş (minor units) or `Decimal(10,2)`. Int kuruş maps directly to PayTR's ×100 format and avoids float issues.
  - The legacy frontend expects `price: number`. Prisma `Decimal` values serialize to JSON as strings (Decimal.js behavior; verify), so a Decimal column needs explicit conversion in response mappers. Int kuruş needs `/100` in the mapper.
  - Never trust client-sent totals.
- **Order creation pattern (v7):** one interactive transaction that:
  1. re-reads product prices and stock,
  2. validates the promo code (expiry, per-user, usage limit),
  3. computes totals server-side,
  4. decrements stock with a guarded `updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })` and checks `count`,
  5. creates the order and items with status `PENDING_PAYMENT`.

  Payment-provider calls and push/email side effects run outside or after the transaction, per Prisma's guidance and the 5 s default timeout.
- **Soft delete:** use a `deletedAt DateTime?` column plus a small custom `$extends` (or explicit `where: { deletedAt: null }` in repositories) rather than an unmaintained extension. Use it for products, categories and users (KVKK account deletion may require real deletion or anonymization of personal data instead; the legal researcher covers this).
- Configure the `pg` Pool explicitly (connectionTimeoutMillis ≈ 5000, max ≈ 10) and SSL settings for managed Postgres, given the v7 default changes.

### Gaps
- Not verified: whether Prisma 8 reached GA after 2026-10-23 (the docs snapshot was dated 23 Oct 2026 and still said RC).
- Not verified: the exact JSON serialization of `Prisma.Decimal` in the v7 `prisma-client` generator. It is standard Decimal.js behavior, but I didn't re-read the docs.
- No official Prisma guidance found specifically on inventory/stock reservation.

## Database: PostgreSQL hosting options and KVKK considerations

### Takeaway
Managed Postgres in an EU region (Neon, Supabase or Prisma Postgres in Frankfurt; Railway in Amsterdam) is cheapest and fastest for an MVP. None of the checked providers offers a Turkey region. Under the 2024 KVKK amendment, hosting customer personal data abroad is a cross-border transfer: it needs an "appropriate safeguard" such as the Board's **standard contract**, notified to the Authority within 5 business days. Alternatively, self-host on a Turkish VPS/cloud. The legal researcher should confirm details.

### Cited Findings
- **Neon pricing:**
  - Free: 100 CU-hours/project, 1 GB storage/project, 6-hour restore window, scale-to-zero after 5 min.
  - Launch: $0.106/CU-hour, $0.35/GB-month storage, up to 7-day history.
  - Scale: $0.222/CU-hour, up to 30-day history.
  - No monthly minimum.
  - [Neon pricing](https://neon.com/pricing)
- **Neon regions:** community threads say Neon chose AWS eu-central-1 (Frankfurt) for EU data residency and opened it in late 2022. [Neon community thread](https://community.neon.tech/t/eu-central-1-support/224) (forum source, not official docs)
- **Supabase regions:** Ireland, London, Paris, Frankfurt (`eu-central-1`), Zurich, Stockholm. No Turkey or Middle East region. Supabase notes that region choice "is a data-location control, not proof of regulatory compliance". [Supabase docs: Regions](https://supabase.com/docs/guides/platform/regions)
- **Railway regions:** the only European region is EU West Metal, Amsterdam (`europe-west4-drams3a`). [Railway docs: Deployment regions](https://docs.railway.com/reference/deployment-regions)
- **Railway pricing:**
  - Hobby: $5/month including $5 usage. Pro: $20/workspace/month including $20 usage.
  - Usage rates: about $20/vCPU-month, about $10/GB RAM-month, volumes about $0.15/GB-month, egress $0.05/GB.
  - The pricing page doesn't mention DB backups.
  - [Railway pricing](https://railway.com/pricing)
- **Prisma Postgres:** Free plan with 200k operations. Pooled TCP recommended for Node servers. Early Access PG16 DBs deleted 1 Nov 2026. [Prisma changelog 2026-10-02](https://www.prisma.io/changelog/2026-10-02)
- **KVKK cross-border transfer (2024 amendment):**
  - Law No. 7499 art. 34 amended KVKK's transfer rules, and an implementing regulation was published in the Official Gazette of 10.07.2024 (No. 32598).
  - New tiers: adequacy decision, then appropriate safeguards (standard contract, BCRs), then limited incidental cases.
  - Explicit consent stopped being a general transfer basis after 1 Sep 2024.
  - Standard contracts must be notified to the Authority within 5 business days of signing, via a notification module opened by Board decision 2024/1793 (17.10.2024).
  - [EY Türkiye](https://www.ey.com/tr_tr/insights/law/kvkk-degisikliginin-yurt-disi-veri-aktarimina-etkisi); [Alomaliye: Standart Sözleşme Bildirim Modülü](https://www.alomaliye.com/2024/10/30/kvkk-standart-sozlesme-bildirim-modulu/)
- **KVKK penalty:** one source cites a 2026 administrative fine range of 90,308 TL to 1,806,377 TL for failing to notify. [Cottgroup](https://www.cottgroup.com/en/legislation/item/standart-sozlesme-bildirim-yukumlulugu-ve-yaptirimlari) (secondary; verify with the legal researcher)
- **KVKK effective date:** sources differ on whether the amendment took effect on 1 June 2024 or 12 March 2024. [Web search summary of EY / hukukcularevi](https://www.ey.com/tr_tr/insights/law/kvkk-degisikliginin-yurt-disi-veri-aktarimina-etkisi)

### Inferences
- **MVP recommendation:**
  - **Neon (Frankfurt), Launch plan:** pay-as-you-go, likely under ~$20/month at MVP load. You get branching for preview/staging and a 7-day restore window. App server on Railway Amsterdam or Hetzner/DO Frankfurt for low latency.
  - **All on one VPS:** a single Hetzner/DigitalOcean VM in Frankfurt running Docker Compose (Node + Postgres) is cheapest, but you own backups (nightly `pg_dump` to R2 plus WAL/PITR if needed).
  - Either EU option means KVKK cross-border transfer paperwork: standard contract with the hosting provider (and Cloudflare, Sentry, Expo, email/SMS vendors) plus notification.
  - If the owner wants to avoid that, use a Turkish provider for DB and app. Payment, SMS and push vendors may still involve transfers.
- Avoid Prisma Postgres + Accelerate for a project starting now, given the Accelerate retirement and the churn. Plain Postgres with `@prisma/adapter-pg` keeps the project portable.
- Supabase is fine as plain Postgres, but its Auth/Storage/RLS overlap with the custom backend. Using only its DB is acceptable, though Neon fits a "Prisma owns the schema" setup more cleanly.

### Gaps
- Not researched: Turkish-hosted cloud/VPS options and prices (e.g. Turkcell Bulut, Radore, Natro) and whether any offers managed Postgres.
- Not verified: Hetzner, DigitalOcean, Render or Fly.io 2026 prices and regions.
- Prisma Postgres region list and paid pricing not fetched.

## Auth: JWT access + refresh vs sessions, password hashing, OTP storage/rate limiting, admin vs customer RBAC

### Takeaway
For the mobile app, use short-lived JWT access tokens plus rotating, DB-stored (hashed) refresh tokens. For the web admin, use the same tokens or a cookie session. Hash passwords with **Argon2id** (OWASP's first preference). Store OTPs hashed with expiry and attempt counters, and rate-limit send/verify. **Critical finding:** the existing app doesn't use per-user auth at all. It sends one hardcoded static bearer token from the app bundle and passes `userId` in URLs and bodies, so the new backend requires frontend auth changes.

### Cited Findings
- **OWASP password storage guidance:**
  - Argon2id is first preference, minimum m=19 MiB (19456 KiB), t=2, p=1. scrypt is the fallback (N=2^17, r=8, p=1).
  - bcrypt is "for legacy systems": work factor at least 10 and a 72-byte input limit.
  - PBKDF2-HMAC-SHA256 at 600,000 iterations only when FIPS is required.
  - [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- **Hashing libraries:** `argon2` 0.45.1 (2026-07-21), `@node-rs/argon2` 2.2.2 (2026-10-06), `bcrypt` 6.0.0. [npm argon2](https://www.npmjs.com/package/argon2); [npm @node-rs/argon2](https://www.npmjs.com/package/@node-rs/argon2); [npm bcrypt](https://www.npmjs.com/package/bcrypt)
- **Token and rate-limit libraries:** `@nestjs/jwt` 12.0.3 and `@nestjs/passport` 12.0.0 support NestJS 12. `jose` is at 6.2.13 (framework-agnostic JWT). `@nestjs/throttler` 6.7.1 supports Nest 12. [npm @nestjs/jwt](https://www.npmjs.com/package/@nestjs/jwt); [npm jose](https://www.npmjs.com/package/jose); [npm @nestjs/throttler](https://www.npmjs.com/package/@nestjs/throttler)
- **Auth framework option:** `better-auth` 1.7.12 declares peers for `prisma`/`@prisma/client` `^5 || ^6 || ^7`. [npm better-auth](https://www.npmjs.com/package/better-auth) (not evaluated in depth)
- **Existing frontend auth:**
  - `src/config/index.tsx` defines one constant `AUTHORIZATION_TOKEN`, sent as `Authorization: Bearer ...` on every request.
  - The RTK Query `fetchBaseQuery` `prepareHeaders` sets the same static token.
  - User-scoped calls pass the user id in the path: `GET api/user/{id}`, `GET api/order/{userId}`, `PUT api/user/update/{id}`, `DELETE api/user/delete/{id}`.
  - Login and verify responses are read as `response.data.user`; nothing reads a per-user token.
  - Login failure is detected via HTTP 401.
  - [Local: config/index.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/config/index.tsx); [Local: store/slices/apiSlice.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/apiSlice.tsx); [Local: screens/SignIn.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/SignIn.tsx)

### Inferences
- **Security problem:** with a shared static token, anyone who extracts it from the app bundle can call `GET /api/order/{anyUserId}` or `DELETE /api/user/delete/{anyId}`. That is an IDOR, and a KVKK data-security issue. The new backend should:
  1. return `{ user, accessToken, refreshToken }` from login, verify-OTP and register;
  2. derive the user from the JWT and ignore or validate path `userId`s against `sub`;
  3. treat the static token at most as a transitional API key.

  The RN app needs ~1-3 days of changes: store tokens in `expo-secure-store`, add an axios/RTK `prepareHeaders` that reads the token, add a refresh-on-401 wrapper, and centralize the scattered axios calls.
- **Suggested token policy:**
  - Access JWT: about 15 min, HS256 or EdDSA, `sub`, `role`.
  - Refresh token: random 256-bit value, stored as a SHA-256 hash in a `RefreshToken` table with a device id. Rotate on each use and revoke the token family on reuse detection. Lifetime about 30-60 days for mobile.
  - Revoke all refresh tokens on password change or account deletion.
- **Admin:** a `role` enum (`CUSTOMER`, `ADMIN`, optionally `STAFF`) on User; NestJS `@Roles()` guard on `/admin/*` routes; separate admin login with optional TOTP later. The admin SPA can use the same JWT flow (refresh token in an httpOnly cookie on the admin domain).
- **Hashing:** use `@node-rs/argon2` or `argon2` with OWASP parameters. `@node-rs/argon2` ships prebuilt binaries, so Docker/Alpine builds are simpler (inference). Avoid bcrypt for new code (72-byte limit).
- **OTP design:**
  - Store a 6-digit code hashed (SHA-256 + pepper or argon2), with `purpose` (EMAIL_VERIFY / PHONE_VERIFY / PASSWORD_RESET), `expiresAt` (5-10 min) and `attempts` (max 5), in Postgres or Redis.
  - Throttle per IP plus per destination: e.g. 1 send/60 s and 5 sends/hour per phone or email, and 10 verify attempts/hour.
  - `@nestjs/throttler` with in-memory storage only works on a single instance; use a Redis store for multiple instances.
  - The app has a "forgot password" flow via email OTP (`SendEmailOtpForgot`, `VerifyEmailForgot` screens), so password reset is OTP-based.

### Gaps
- Not researched: Turkish SMS/OTP providers (Netgsm, İleti Merkezi, etc.), their Node SDKs, and sender-ID/İYS onboarding lead times. These are a likely schedule risk.
- Not verified: current RFC/OWASP wording on refresh-token rotation for native apps. The pattern above is standard practice, not re-cited here.

## Validation and API contracts: zod vs class-validator, OpenAPI generation, compatibility with the existing frontend's paths and shapes

### Takeaway
Generate OpenAPI from code: `@nestjs/swagger` + class-validator DTOs in NestJS, or zod type providers in Fastify/Hono. Write a **contract-compatibility layer** that reproduces the legacy Laravel-style paths and response shapes the Expo app hard-codes. The shapes include bare JSON arrays for lists, `{ user }` / `{ promocode }` wrappers, HTTP 200 on POST, numeric ids, and denormalized string arrays on products. Expose a cleaner versioned API (`/v1`, `/admin`) alongside.

### Cited Findings
- **Validation library versions:** `zod` 4.6.7 (4.0.0 was 2025-07-09) and `class-validator` 0.15.1 (2026-02-26). [npm zod](https://www.npmjs.com/package/zod); [npm class-validator](https://www.npmjs.com/package/class-validator)
- **OpenAPI generation:**
  - `@nestjs/swagger` 12.0.4 peers class-validator/class-transformer. Swagger 12 changed how nullable schemas are spelled in the generated document. [npm @nestjs/swagger](https://www.npmjs.com/package/@nestjs/swagger); [newreleases @nestjs/swagger 12](https://newreleases.io/project/npm/@nestjs/swagger/release/12.0.0)
  - `@scalar/nestjs-api-reference` 1.2.31 is available for an API reference UI. [npm @scalar/nestjs-api-reference](https://www.npmjs.com/package/@scalar/nestjs-api-reference)
- **Legacy endpoint paths the app hard-codes** (base URL + `api/`):
  - GET: `user/{id}`, `order/{userId}`, `plants`, `colors`, `reviews/{productId}`, `banners`, `slides`, `pot/types`, `promocodes`, `categories`, `plant/types`.
  - POST: `user/login`, `user/create`, `order/create`, `review/create`, `promocode/show`, `change/password`, `send/otp/email`, `send/otp/phone`, `verify/otp/phone`, `verify/otp/email`.
  - PUT: `user/update/{id}`.
  - DELETE: `user/delete/{id}`.
  - [Local: config/index.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/config/index.tsx)
- **Response shapes:**
  - RTK Query `transformResponse` expects **bare arrays** for plants, colors, banners, slides, pot types, plant types, categories and promocodes (`Array.isArray(response) ? response : []`). A wrapped `{data: [...]}` silently produces empty lists.
  - `getUser` treats a falsy body as logout.
  - [Local: apiSlice.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/apiSlice.tsx)
- **Wrappers and status codes:** login, update and verify read `response.data.user`; promocode/show reads `response.data.promocode`. SignIn and Checkout require `response.status === 200` (Checkout navigates to "OrderFailed" otherwise). [Local: screens/SignIn.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/SignIn.tsx); [Local: screens/Checkout.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Checkout.tsx)
- **Types:**
  - `ProductType`: numeric `id`, `price: number`, `oldPrice?`, `image`, `images: string[]`, `potTypes: string[]`, `sizes: string[]`, `colors: string[]`, `categories: string`, `plantTypes: string[]`, `types: string[]`, `reviews: ReviewType[]`, `rating`, flags (`isBestSeller` **and** `isBestseller`, `isFeatured`, `isNew`, `isTop`), `promotion`.
  - `PromocodeType` mixes `userId` with snake_case `expires_at`.
  - `UserType`: `id?: number`, `phoneVerified`, `emailVerified`, `location`, `phoneNumber`.
  - [Local: types/ProductType.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/ProductType.tsx); [Local: types/PromocodeType.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/PromocodeType.tsx); [Local: types/UserType.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/UserType.tsx)
- **Checkout payload:** POST `order/create` sends client-computed `total`, `subtotal`, `discount`, `delivery`, plus `products: cart`, `userId`, `email`, `phoneNumber`, `name`, `address`, `cardHolderName`. The payment slice also holds `cardNumber` (not sent in this payload). [Local: screens/Checkout.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Checkout.tsx)

### Inferences
- **Use numeric autoincrement ids** (`Int @id @default(autoincrement())`) for User, Product, Order and similar, because the app types ids as `number`. Avoid UUID/cuid unless you also change the frontend.
- Model products relationally (Category, Color, PotType, PlantType, Size as tables with many-to-many joins, ProductImage table). Flatten to the legacy string arrays in a `toLegacyProduct()` mapper. Pick one canonical bestseller flag and emit both spellings.
- **Order of work:** write the contract mappers and a contract test suite first (supertest or Pactum snapshots of each legacy endpoint's JSON). This is the cheapest guard against "the app shows empty screens" regressions.
- **Server-side checkout:** recompute every total. Accept only `{ items: [{productId, qty, potType?, color?, size?}], addressId/address, promoCode? }` and ignore client totals.
- **Card data:** remove card-number entry from the app and use iyzico Checkout Form or PayTR iFrame in a WebView/browser (see Payments). Keeping card data off your servers keeps the backend out of most PCI DSS scope. This is an RN-side change to schedule.
- Keep legacy routes under `/api/*` for the existing app build. Put the cleaner contract under `/v1/*` with proper auth for the next app release. Admin routes go under `/admin/*` with list/filter/pagination conventions the admin framework expects.
- **Validation choice:** class-validator in NestJS (first-class Swagger). Use zod only if you pick Fastify/Hono, or if you want to share schemas with the RN app and admin through a `packages/contracts` workspace.

### Gaps
- I didn't read every screen's request body (e.g. LeaveAReview, SignUp, VerifyEmail). The implementer should extract each request/response pair into a contract doc in week 1.
- The legacy production backend at the configured domain was not inspected, so actual historical response payloads (e.g. exact review/order shapes) are unknown.

## Images: product image upload, storage (R2/S3/Bunny/Cloudinary), resizing and CDN

### Takeaway
For an MVP, use **Cloudflare R2** (S3 API, zero egress) with presigned uploads from the admin panel. Do resizing either with `sharp` on upload (generate 3-4 fixed widths, WebP/AVIF) or with an image CDN transform service. This adds about 0.5-1 person-week.

### Cited Findings
- **R2 pricing:**
  - Storage: $0.015/GB-month.
  - Operations: Class A $4.50/million, Class B $0.36/million.
  - Free tier: 10 GB-month, 1M Class A, 10M Class B.
  - **Egress is free**, including via the S3 API.
  - The pricing page doesn't cover Cloudflare Images/resizing.
  - [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- **Libraries:** `@aws-sdk/client-s3` 3.1156.0 (2026-10-22) and `sharp` 0.35.5 (2026-09-27). [npm @aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3); [npm sharp](https://www.npmjs.com/package/sharp)
- **Alternatives:** Railway object storage costs $0.015/GB-month with free egress. [Railway pricing](https://railway.com/pricing) Neon object storage costs $0.023/GB-month. [Neon pricing](https://neon.com/pricing)
- **Legacy shape:** products expose `image: string` plus `images: string[]` (full URLs), and the carousel is a string array. [Local: ProductType.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/ProductType.tsx); [Local: apiSlice.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/apiSlice.tsx)

### Inferences
- **Flow:**
  1. The admin requests `POST /admin/uploads/presign` and gets an R2 presigned PUT URL.
  2. The browser uploads directly.
  3. The backend records a `ProductImage { key, width, height, sort }`.
  4. A worker or the request handler runs `sharp` to create `thumb` / `md` / `lg` WebP variants.
  5. The API returns public URLs on a custom domain (e.g. `img.example.com`) backed by the R2 bucket and Cloudflare cache.
- Cloudinary or Bunny Optimizer cut resizing code to near zero, at a per-transform or bandwidth cost.

### Gaps
- Not fetched: Cloudinary, Bunny.net and Cloudflare Images 2026 pricing, so no cost comparison.

## Admin panel options with Prisma, and headless Node e-commerce engines

### Takeaway
**AdminJS is no longer a safe choice.** It has had no release since July 2025, Snyk marks it "Inactive", and `@adminjs/prisma` declares only `@prisma/client ^5 || ^6`, not Prisma 7. Choose **react-admin 5** (most mature, actively released in Oct 2026) or **Refine 5** (also active, Turkish-founded) as a separate React SPA calling `/admin/*` REST endpoints, rather than a full custom Next.js + shadcn build. Headless engines conflict with the Prisma constraint (Medusa v2 uses MikroORM; Vendure uses TypeORM and is GPL), so a custom Node + Prisma backend is justified.

### Cited Findings
- **AdminJS:**
  - `adminjs` 7.8.17, last published 2025-07-15. Repo last pushed 2025-07-15, 223 open issues, 9.0k stars.
  - `@adminjs/prisma` 5.0.4 (2025-06-18) peers `@prisma/client ^5.0.0 || ^6.0.0`.
  - `@adminjs/nestjs` 7.0.0 (2025-10-02).
  - [npm adminjs](https://www.npmjs.com/package/adminjs); [npm @adminjs/prisma](https://www.npmjs.com/package/@adminjs/prisma); [GitHub SoftwareBrothers/adminjs](https://github.com/SoftwareBrothers/adminjs)
- **AdminJS health:** Snyk Advisor rates AdminJS maintenance "Inactive" (health 69/100). [Snyk Advisor: adminjs](https://dev.snyk.io/advisor/npm-package/adminjs) (Snyk Advisor is being sunset, so the data may be dated)
- **react-admin:**
  - `react-admin` 5.15.5 (2026-10-19); 5.0.0 was 2024-06-20. `ra-data-simple-rest` 5.15.5.
  - Repo pushed 2026-10-24, 27.0k stars, 67 open issues.
  - [npm react-admin](https://www.npmjs.com/package/react-admin); [GitHub marmelab/react-admin](https://github.com/marmelab/react-admin)
- **Refine:**
  - `@refinedev/core` 5.0.12 (2026-04-02); 5.0.0 was 2025-09-03. Data providers `@refinedev/simple-rest` and `@refinedev/nestjsx-crud` are at 6.0.1.
  - Repo pushed 2026-09-10, 35.9k stars.
  - Peers React 18/19 and TanStack Query v5.
  - [npm @refinedev/core](https://www.npmjs.com/package/@refinedev/core); [GitHub refinedev/refine](https://github.com/refinedev/refine)
- **react-admin vs Refine (vendor-authored, biased):**
  - Marmelab's 2023 feature matrix (by the react-admin team) rates react-admin stronger on relationships, undo, filtering and i18n. [Marmelab blog](https://marmelab.com/blog/2023/07/04/react-admin-vs-refine.html)
  - Refine's own article says CORE v5 added React 19 and TanStack Query v5. [Refine blog](https://refine.dev/blog/refine-vs-react-admin/)
  - Refine is maintained by the Turkish company Pankod. [Web search summary of the Refine comparison page](https://refine.dev/core/docs/further-readings/comparison/)
- **Medusa:**
  - `@medusajs/medusa` 2.22.1 (2026-10-23); v2.0.0 was 2024-10-22. Repo pushed 2026-10-23, 36.9k stars.
  - `@medusajs/deps` 2.22.1 pins `@mikro-orm/core` / `@mikro-orm/postgresql` 6.6.14.
  - Requires Node >= 22.22 and Redis (`ioredis` peer).
  - [npm @medusajs/medusa](https://www.npmjs.com/package/@medusajs/medusa); [npm @medusajs/deps](https://www.npmjs.com/package/@medusajs/deps); [GitHub medusajs/medusa](https://github.com/medusajs/medusa)
  - Medusa's team chose MikroORM as its ORM (pre-v2 discussion). [Medusa discussion #4431](https://github.com/medusajs/medusa/discussions/4431)
- **Vendure:** `@vendure/core` 3.8.1 (2026-10-23) depends on `typeorm ^0.3.21` and `@nestjs/typeorm ^12.0.1`; its license is **GPL-3.0-or-later**. [npm @vendure/core](https://www.npmjs.com/package/@vendure/core)
- **Saleor:** Python/Django, which violates the Node constraint (well-known; no fetch needed).

### Inferences
- **Recommendation: react-admin 5 SPA (Vite) under `admin.example.com`, with these pieces:**
  - a small custom `dataProvider` (or `ra-data-simple-rest` conventions) against NestJS `/admin/*` endpoints;
  - an `authProvider` using the admin JWT;
  - resources for Products (with image upload, attributes and stock), Categories/Colors/PotTypes/PlantTypes, Orders (status transitions plus a "send push" side effect), Users (view, deactivate, KVKK delete/anonymize), Banners, Carousel slides, Promocodes and Reviews (approve/hide);
  - a simple dashboard.
  - Effort: about 1.5-2.5 person-weeks including admin endpoints' list/filter/sort/pagination. A custom Next.js + shadcn/ui admin with TanStack Table and react-hook-form would likely take 1.5-2x longer for the same CRUD coverage.
- **Refine 5** is an equally valid choice, especially with Ant Design/shadcn UI kits or if the team likes headless hooks. Its last core release (April 2026) is less recent than react-admin's (October 2026).
- AdminJS + Prisma 7 would need a forked or unofficial adapter, which is not acceptable maintenance risk for a new build.
- **Headless engines:**
  - Medusa v2 (MikroORM, Redis, its own module and workflow model) and Vendure (TypeORM, GraphQL-first, GPL) both conflict with the owner's fixed "Prisma" constraint.
  - Neither provides iyzico/PayTR out of the box (inference; no official plugins checked).
  - Adapting either to the app's legacy REST shapes would need a compatibility facade anyway.
  - With ~24 simple endpoints and one store, a custom NestJS + Prisma backend is justified and probably not slower than learning and bending Medusa.

### Gaps
- No up-to-date (2025-2026) independent comparison of react-admin vs Refine found; available comparisons are vendor-authored.
- Not checked: community iyzico/PayTR plugins for Medusa or Vendure.
- Not verified: Medusa v2's exact license text (the npm field says "SEE LICENSE IN LICENSE"; `@medusajs/deps` is MIT).

## Payments in Node: iyzipay SDK and PayTR integration, webhook/callback handling and idempotency

### Takeaway
Both providers are integrable from Node. **iyzico** has an official, actively maintained but **JavaScript-only, callback-style** SDK (`iyzipay` 2.0.71, Oct 2026); community `@types/iyzipay` were last updated Feb 2024. **PayTR** has no official npm SDK, only documented HMAC formulas and a Node sample, so you write a ~100-line client. Use hosted flows (iyzico Checkout Form / PayTR iFrame) so the app never collects card numbers. Make callbacks idempotent: PayTR retries every minute until it gets "OK"; iyzico retries webhooks about every 15 min.

### Cited Findings
- **iyzipay SDK:**
  - `iyzipay` 2.0.71 published 2026-10-22. Its only dependency is `postman-request`, and it ships no `types` field.
  - `@types/iyzipay` 2.0.3 was last published 2024-02-11.
  - [npm iyzipay](https://www.npmjs.com/package/iyzipay); [npm @types/iyzipay](https://www.npmjs.com/package/@types/iyzipay)
- **iyzipay-node repo activity:** v2.0.71 (2026-10-22) updated CI for Oct 2026 Node security releases. v2.0.70 (2026-09-24) added `iyzipay.webhook.update()`. The repo has 245 stars, 24 open issues and the language is JavaScript. [GitHub iyzico/iyzipay-node commits](https://github.com/iyzico/iyzipay-node/commits/master); [GitHub iyzico/iyzipay-node](https://github.com/iyzico/iyzipay-node)
- **iyzipay README:** callback API (`iyzipay.payment.create(request, function (err, result) {...})`), sandbox `https://sandbox-api.iyzipay.com`, env vars `IYZIPAY_URI` / `IYZIPAY_API_KEY` / `IYZIPAY_SECRET_KEY`, mock test cards, and "officially maintained by iyzico". TypeScript is not mentioned. [GitHub iyzico/iyzipay-node](https://github.com/iyzico/iyzipay-node)
- **iyzico webhooks:**
  - The `X-IYZ-SIGNATURE-V3` header is HMAC-SHA256 (key = secretKey), **hex-encoded**.
  - Checkout Form/HPP string to sign: `secretKey + iyziEventType + iyziPaymentId + token + paymentConversationId + status`.
  - Direct payment string to sign: `secretKey + iyziEventType + paymentId + paymentConversationId + status`.
  - The V1/V2 signatures are no longer supported, and V3 is sent only after you ask iyzico integration support to enable it.
  - Webhook URLs (HTTPS) are configured in the Merchant Portal.
  - The first POST arrives 10-15 s after the payment attempt and retries about every 15 min until a 2xx. The page says both "3 attempts" and "until 2xx" (ambiguous).
  - [iyzico docs: Webhook](https://docs.iyzico.com/en/advanced/webhook)
- **PayTR iFrame API callback:**
  - POST fields: `merchant_oid`, `status` (success/failed), `total_amount` (×100), `hash`, `failed_reason_code` / `failed_reason_msg`, `test_mode`, `payment_type` (card/eft), `currency`, `payment_amount`.
  - Hash: `base64(HMAC-SHA256(merchant_oid + merchant_salt + status + total_amount, merchant_key))`.
  - Respond with plain `OK` and nothing else. Don't put session control on the callback URL.
  - PayTR retries after 1 minute if it gets no `OK`, and the payment stays "In Progress" until then.
  - Duplicates happen; only the first notification per `merchant_oid` should change the order.
  - `total_amount` can exceed `payment_amount` (installments).
  - Step 1 `get-token` request: `paytr_token = base64(HMAC-SHA256(merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode + merchant_salt, merchant_key))`.
  - [PayTR dev docs: iFrame API step 2](https://dev.paytr.com/en/iframe-api/iframe-api-2-adim)
- **PayTR community npm packages (no official SDK found):** `paytr-node` 1.0.1 (2025-03), `@hubcommerce/paytr` 1.0.2 (2026-08), `node-paytr` 1.1.0 (2022), `paytr.js` 0.0.5 (2026-02). [npm search "paytr"](https://www.npmjs.com/search?q=paytr)

### Inferences
- **Provider choice (business call):** iyzico gives an official SDK, Checkout Form and a subscription API. PayTR gives a simpler HMAC iFrame flow with installment support. For the RN app, either hosted page opens in a WebView or `expo-web-browser` and returns via deep link or the `merchant_ok_url`. The backend treats only the server-to-server callback or webhook as the source of truth, never the redirect.
- **Wrap `iyzipay` in a typed service:** `promisify` the callbacks, add your own zod/TS types for the few calls you need (`checkoutFormInitialize.create`, `checkoutForm.retrieve`, `refund`, `cancel`). Don't depend on the stale `@types/iyzipay`.
- **Idempotency design:**
  - A `Payment` table with `provider`, `providerRef` (PayTR `merchant_oid` / iyzico `token` or `paymentId`), `UNIQUE(provider, providerRef)`, `status` and `rawPayload`.
  - Process the callback inside a transaction that moves the order through `PENDING_PAYMENT → PAID | PAYMENT_FAILED` only if it's still pending. Always reply `OK` / 2xx for duplicates.
  - Verify the signature with `crypto.timingSafeEqual`.
  - For iyzico, also call `checkoutForm.retrieve` with the token before fulfilling (common safeguard; not stated on the webhook page).
  - Release reserved stock on failure or timeout via a scheduled job.
- The PayTR callback must accept `application/x-www-form-urlencoded` and respond `text/plain` "OK". Make sure global JSON interceptors or response wrappers in NestJS don't alter it (use `@Res()` or `@Header('Content-Type','text/plain')`).
- **Testing:** both offer sandbox/test mode. Budget time for a public HTTPS callback URL in dev (ngrok/cloudflared) and for asking iyzico to enable V3 webhook signatures.

### Gaps
- Not verified: merchant onboarding lead times and document requirements for iyzico/PayTR (company type, Vergi levhası, etc.), commission rates, settlement periods. Likely covered by the market/legal researchers, but they matter for the schedule.
- I didn't fetch iyzico's Checkout Form initialize/retrieve API reference or PayTR's step 1 doc page; the step 1 fields above come from PayTR's step 2 page sample code.
- No information found on 3DS-specific callback differences for the Checkout Form beyond the webhook formats.

## Push notifications for Expo (expo-server-sdk) for order status

### Takeaway
Use `expo-server-sdk` 8.0.0 (needs Node >= 22.12). Store Expo push tokens per user and device, send on order-status changes, persist ticket ids, poll receipts about 15 minutes later (receipts expire in 24 h), and deactivate tokens on `DeviceNotRegistered`. Effort is about 2-4 days.

### Cited Findings
- **Versions:** `expo-server-sdk` 8.0.0 published 2026-10-22 with engines `node >=22.12.0`. Majors 5, 6, 7 and 8 were all released in 2026 (5.0.0 on 2026-02-04, 8.0.0 on 2026-10-22). The repo has 2 open issues. [npm expo-server-sdk](https://www.npmjs.com/package/expo-server-sdk); [GitHub expo/expo-server-sdk-node](https://github.com/expo/expo-server-sdk-node)
- **Expo push service facts (Expo docs):**
  - The SDK gzips, throttles, caps concurrency at 6 and retries with backoff.
  - Up to 100 messages per send request; up to 1000 ticket ids per receipt lookup.
  - Rate limit: **600 notifications/second per project**. Payload max 4 KiB.
  - A ticket does not equal delivery. Check receipts about 15 min after sending; receipts are cleared after 24 h.
  - On `DeviceNotRegistered`, stop sending to that token.
  - An optional access token ("enhanced push security") can be required.
  - Android needs FCM V1 service-account credentials uploaded to EAS; iOS uses an APNs key.
  - [Expo docs: Sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)

### Inferences
- Schema: `PushToken { id, userId, token UNIQUE, platform, active, lastSeenAt }` and `PushTicket { id, ticketId, tokenId, createdAt, checkedAt }`. Add a `POST /v1/push-tokens` endpoint, plus RN code using `expo-notifications` to get the token after login. That is new frontend work, since the current app has no such call (inference from the endpoint list).
- Send pushes after the DB commit (order status change in admin) through a lightweight job queue: a Postgres-backed queue like pg-boss or graphile-worker, or BullMQ if Redis is already in use. Run a cron every ~15 min to fetch receipts.
- Because Node >= 22.12 is required, standardize the runtime on Node 22 LTS (>= 22.18 also satisfies Prisma 8's floor for a future upgrade).

### Gaps
- I didn't read the expo-server-sdk 5→8 changelog. Breaking changes across the four 2026 majors (e.g. ESM-only, API renames) are unverified, so check them before coding.
- Not verified: compatibility of Expo SDK 50 (the app's version, from early 2024) with current EAS push credential flows and FCM v1. An Expo SDK upgrade may be needed for store submission; that belongs to the frontend scope.

## Deployment and ops for an MVP: hosting, CI, logging/monitoring, backups

### Takeaway
The simplest reliable MVP setup: a Dockerized NestJS app on **Railway (Amsterdam) or a Hetzner/DO VM in Frankfurt**, **Neon Postgres (Frankfurt)** with its built-in restore window plus a nightly `pg_dump` to R2, GitHub Actions running lint, typecheck, tests, `prisma migrate deploy` and deploy, **pino** for structured logs, and **Sentry** for errors. Pin `prisma@7` everywhere in CI.

### Cited Findings
- **Railway:** pricing and regions as in the Database section. Hobby and Pro differ in log history (7 vs 30 days), replicas and volume caps (5 GB vs 1 TB). [Railway pricing](https://railway.com/pricing); [Railway regions](https://docs.railway.com/reference/deployment-regions)
- **Neon restore window:** 6 h (Free), up to 7 days (Launch), up to 30 days (Scale); instant restore is $0.20/GB-month. [Neon pricing](https://neon.com/pricing)
- **Logging and errors:** `pino` 10.4.0 (2026-10-02) and `@sentry/node` 11.9.0 (2026-10-23). [npm pino](https://www.npmjs.com/package/pino); [npm @sentry/node](https://www.npmjs.com/package/@sentry/node)
- **CI pinning:** pin CI to `prisma@7` / `npx prisma@7`, since `latest` is now v8. [Prisma changelog 2026-10-02](https://www.prisma.io/changelog/2026-10-02); [Prisma release status](https://www.prisma.io/docs/orm/release-status)
- **Prisma 7 migration workflow:** `migrate dev` no longer runs generate or seed, so run `prisma generate` and `prisma db seed` explicitly. Configure the connection in `prisma.config.ts`, and load env vars yourself. [Prisma 7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)

### Inferences
- **Pipeline:**
  - On PRs: `npm ci` → `npx prisma@7 generate` → typecheck/lint → unit tests + contract tests against a Postgres service container.
  - On merge to main: build the Docker image (multi-stage, Node 22-slim) → run `npx prisma@7 migrate deploy` as a release step → deploy (Railway auto-deploys from GitHub, or `docker compose pull && up -d` over SSH on a VPS).
  - Use a Neon branch per PR or staging if useful.
- **Ops minimums for go-live:**
  - `/health` (DB ping) monitored by an uptime checker.
  - Sentry with a PII scrubber (KVKK: don't send emails or phones in breadcrumbs).
  - pino with request-id and redaction of `authorization`, `password`, `otp`.
  - Nightly `pg_dump` to R2 kept 14-30 days, plus a documented restore drill.
  - Secrets in the platform's env store.
  - Separate staging and prod environments, each with its own iyzico/PayTR sandbox keys.
- **Cost (inference):** Railway Hobby or Pro ($5-20 plus usage) + Neon Launch (~$5-20) + R2 (likely free tier) + Sentry free tier lands around **$15-50/month** at MVP scale. A single Hetzner VM is cheaper but costs more ops time.

### Gaps
- Not verified: Render, Fly.io, Hetzner and DigitalOcean 2026 pricing and region details.
- Not checked: Sentry plan limits or EU data-region options (relevant for KVKK).

## Effort: realistic person-week estimates for this custom e-commerce MVP backend + admin, and common pitfalls

### Takeaway
Published estimates are mostly agency marketing (6-12 weeks for an e-commerce MVP; about 8-12 weeks for "backend"). A bottom-up breakdown for this scope (24 legacy endpoints + admin API + react-admin UI + one payment provider + OTP + push + frontend auth/payment changes) comes to about **13-18 person-weeks plus a 15-25% buffer, i.e. ~15-22 person-weeks**. That is roughly **9-12 calendar weeks for two developers** or **4-5 months for one**. Payment and SMS onboarding, legacy contract mismatches, and admin scope creep are the most common causes of slips.

### Cited Findings
- **Vendor/agency estimates (marketing pages, low rigor; figures surfaced via web search summary, not fetched):**
  - Backend "about 8 to 12 weeks", split into DB setup 2-3 weeks, server-side logic 3-5 weeks and APIs 3-4 weeks. [Oyova: how long to build an eCommerce website](https://www.oyova.com/?p=33210)
  - Small e-commerce MVP 8-12 weeks; mid-scale custom 4-6 months. [PerfectionGeeks: eCommerce MVP cost](https://www.perfectiongeeks.com/industries/ecommerce/ecommerce-mvp-development-cost)
  - An MVP-timeline article cites 6-8 weeks of development / 8-12 weeks overall including discovery and testing. [Adam Fard: MVP timeline](https://adamfard.com/blog/mvp-timeline-how-long-should-it-take-to-build-an-mvp)
  - A freelancer offers a "~2 weeks" React/Next.js store MVP. This assumes a template and tiny scope, so it is not comparable. [Contra listing](https://contra.com/s/bBrPg2vv-reactnextjs-online-store-mvp-in-2-weeks)
  - A sample e-commerce project plan totals 499.1 hours (~12.5 person-weeks) for a whole site including back-office admin interfaces for categories, products and orders. [Scribd: project plan sample](https://www.scribd.com/document/369124109/projectplan-sample2)
- **Scope-specific risk facts (from the sections above):**
  - iyzico V3 webhook signatures must be enabled by contacting iyzico. [iyzico webhook docs](https://docs.iyzico.com/en/advanced/webhook)
  - `prisma@latest` now installs an RC v8 CLI that breaks v7 workflows. [Prisma release status](https://www.prisma.io/docs/orm/release-status)
  - The legacy app expects bare arrays, 200-on-POST and a static token. [Local apiSlice.tsx](/Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/apiSlice.tsx)
  - AdminJS's Prisma adapter lacks Prisma 7 support. [npm @adminjs/prisma](https://www.npmjs.com/package/@adminjs/prisma)

### Inferences
**Bottom-up estimate (one mid/senior TypeScript developer; person-weeks, low–high):**

| # | Work package | PW low | PW high |
|---|---|---|---|
| 1 | Repo/monorepo setup, NestJS 12 skeleton, Prisma 7 + adapter-pg + prisma.config.ts, ESM/CJS spike, Docker, env/config, error format, pino, Sentry, CI | 0.75 | 1.0 |
| 2 | Data model + migrations + seed (User, RefreshToken, OtpCode, Product, ProductImage, Category, Color, PotType, PlantType, Size, Banner, CarouselSlide, Review, Promocode, Order, OrderItem, Payment, PushToken, Address) | 0.75 | 1.0 |
| 3 | Auth: register/login/JWT + refresh rotation, change password, delete account, get/update user, RBAC guards, Argon2id | 1.0 | 1.5 |
| 4 | OTP email + phone (send/verify, hashing, expiry, throttling) incl. email + SMS provider integration | 0.5 | 1.0 |
| 5 | Catalog read endpoints (plants, categories, colors, pot/plant types, banners, slides) + legacy response mappers + contract tests | 0.75 | 1.0 |
| 6 | Reviews (list/create, rating aggregation) + promocodes (list/validate) | 0.5 | 0.75 |
| 7 | Orders: server-side pricing, promo application, stock decrement transaction, order status state machine, list by user | 1.0 | 1.5 |
| 8 | Payment: one provider (iyzico CF or PayTR iFrame) init, callback/webhook, signature check, idempotency, refunds/cancel minimal, sandbox E2E | 1.5 | 2.0 |
| 9 | Image upload pipeline (R2 presign, sharp variants, CDN domain) | 0.5 | 1.0 |
| 10 | Admin REST API (CRUD + list/filter/sort/pagination for ~10 resources, order status updates, review moderation) | 1.0 | 1.5 |
| 11 | Admin UI (react-admin 5): auth, ~10 resources, image upload widget, order detail/status, simple dashboard | 1.5 | 2.5 |
| 12 | Push notifications (token registration, send on status change, receipt job) | 0.4 | 0.6 |
| 13 | RN app integration changes (token storage/refresh, payment WebView flow replacing card entry, push token registration, base URL/env, fixing contract mismatches) | 1.0 | 1.5 |
| 14 | Hardening + go-live: e2e tests of critical flows, security review (rate limits, IDOR checks, CORS, helmet), KVKK items (account deletion/anonymization, data retention, logs redaction), staging/prod deploy, backups/restore drill | 1.0 | 1.5 |
| | **Subtotal** | **~12.2** | **~17.9** |
| | Buffer 15-25% (UAT, bug fixes, vendor delays) | +1.8 | +4.5 |
| | **Total** | **~14** | **~22** |

- **Calendar conversion:**
  - **2 developers:** ~8-12 calendar weeks. Parallelization isn't perfect: payments, auth and contracts sit on the critical path. A natural split is Dev A on backend core/payments and Dev B on admin UI/admin API/RN changes.
  - **1 developer:** ~15-22 weeks.
  - These figures line up with the agency range (8-12 weeks) when a team of two is assumed.
- **Suggested critical path for a week-by-week plan:**
  - Weeks 1-2: setup + schema + contract doc + auth.
  - Weeks 3-4: catalog/reviews/promos + admin API scaffold + react-admin shell.
  - Weeks 5-6: orders + payment sandbox + image pipeline.
  - Weeks 7-8: admin completeness + push + RN integration.
  - Weeks 9-10: hardening, staging UAT, KVKK items, prod launch.
  - Start the payment merchant application and SMS sender-ID registration in **week 1**, since they run on vendor time.
- **Common slip causes:**
  1. Payment merchant approval, test-to-live switch, V3 webhook enablement.
  2. SMS OTP provider onboarding (sender ID/İYS).
  3. Hidden legacy contract details (bare arrays, field spellings, 200 vs 201, numeric ids), which cause "empty screen" bugs late in QA.
  4. Moving card entry to hosted checkout, which changes the RN UX and needs re-testing on iOS and Android.
  5. Admin scope creep (reports, bulk import, variants/sizes inventory).
  6. Prisma 7 ESM/driver-adapter and SSL/pool defaults, plus accidental Prisma 8 RC installs.
  7. App store work if the Expo 50 app must be upgraded to a current SDK for submission and push credentials. This is outside backend scope but on the same release path.
  8. KVKK deliverables (aydınlatma metni, açık rıza for marketing, VERBİS check, cross-border standard contracts).

### Gaps
- No rigorous public dataset found on person-week effort for custom e-commerce MVPs; all published numbers are vendor marketing. The table above is a reasoned estimate, not a sourced fact.
- Estimates assume a mid/senior developer already fluent in TypeScript/NestJS/Prisma. For a team new to NestJS, add ~1 person-week of ramp-up.
- Vendor onboarding durations (iyzico/PayTR, SMS providers) were not found and are the largest unknowns in the schedule.
