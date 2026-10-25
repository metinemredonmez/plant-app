# ADR 0001: Monorepo yapısı

- Durum: Kabul edildi
- Tarih: 25 Ekim 2026

## Bağlam

Proje üç parçadan oluşacak: mevcut Expo uygulaması, yeni bir REST API ve bir admin paneli. Üçü aynı API sözleşmesini paylaşıyor. Şablon klasörü (`everbloom-plant-store-expo-...`) ve ilgisiz `platform-master` (Laravel Orchid) aynı dizinde duruyordu.

## Karar

```
apps/mobile        Expo 50 uygulaması (şablondan taşındı, kendi yarn.lock'u ile)
apps/api           NestJS 12 + Prisma 7 REST API
apps/admin         react-admin paneli (9. hafta; şimdilik yalnızca README)
packages/contract  API sözleşmesi: uç listesi, zod şemaları, fikstürler, mock sunucu
docs/adr           Mimari karar kayıtları
docs/template      Şablonun Figma dosyası, PDF dokümanı ve videosu
```

- Paket yöneticisi **pnpm workspace**. Workspace'te yalnızca `apps/api` ve `packages/*` var.
- `apps/mobile` bilinçli olarak workspace dışında ve kendi `"packageManager": "yarn@1.22.22"` alanını taşıyor (3. haftada eklendi; olmadan corepack kökteki pnpm ayarı yüzünden `yarn` komutlarını reddediyor). Expo 50 ve Metro, pnpm'in symlink'li `node_modules` düzeniyle sorunsuz çalışmıyor. Uygulama şablondan gelen `yarn.lock` ve `node_modules` ile olduğu gibi kalıyor. Expo SDK yükseltmesinde (ADR 0005) bu karar yeniden ele alınacak.
- `platform-master` kullanılmıyor (sahibinin kararı: Laravel/PHP yok). Silinmedi; silmek sahibinin kararı.

## Sonuçlar

- Kök dizinden `pnpm mock`, `pnpm api:dev`, `pnpm test` çalışıyor. Mobil için `pnpm mobile` (içeride `yarn start`).
- `apps/mobile/.git` şablon yazarının tek commit'lik geçmişini taşıyor. Kökte git başlatılmadan önce bu klasörün silinmesi ya da submodule'e çevrilmesi gerekiyor. Aksi halde git onu gömülü depo olarak görür. Karar sahibinde.
- Rapordaki ve araştırma notlarındaki `file://` bağlantıları yeni `apps/mobile/` yoluna güncellendi.
