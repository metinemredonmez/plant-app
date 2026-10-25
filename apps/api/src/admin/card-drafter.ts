import { z } from 'zod';

import type { TokenUsage } from '../costs/prices.js';

/**
 * What the language model fills in for a new care card. An expert checks
 * every field before the card is published (ADR 0015).
 */
export const cardDraftSchema = z.object({
  turkishName: z.string(),
  otherNames: z.array(z.string()),
  family: z.string().nullable(),
  light: z.enum(['LOW', 'PARTIAL', 'BRIGHT_INDIRECT', 'DIRECT']),
  difficulty: z.enum(['NO_FUSS', 'EASY', 'MODERATE']),
  waterSummerDays: z.number().int(),
  waterWinterDays: z.number().int(),
  humidity: z.enum(['düşük', 'orta', 'yüksek']),
  tempMinC: z.number().int(),
  tempMaxC: z.number().int(),
  toxicToPets: z.boolean().nullable(),
  toxicityNote: z.string().nullable(),
  summary: z.string(),
  wateringTip: z.string(),
  lightTip: z.string(),
  fertilizingTip: z.string(),
  commonProblems: z.array(z.string()),
  spots: z.array(z.enum(['INDOOR', 'BALCONY', 'GARDEN'])),
});
export type CardDraft = z.infer<typeof cardDraftSchema>;

export interface Drafted {
  card: CardDraft;
  model?: string;
  usage?: TokenUsage;
}

export abstract class CardDrafter {
  abstract readonly name: 'fake' | 'anthropic';
  abstract draft(scientificName: string): Promise<Drafted>;
}

export class CardDraftError extends Error {}

export const DRAFT_PROMPT = `Türkiye'deki ev, balkon ve bahçe bitkileri için Türkçe bakım kartı taslağı yazıyorsun. Taslağı bir ziraat mühendisi kontrol edip yayınlayacak.

Kurallar:
- Türkçe yaz; kısa, sade ve uygulanabilir ol. Türkiye iklimini ve balkon kültürünü düşün.
- Emin olmadığın bilgiyi uydurma. Evcil hayvanlar için zehirliliği bilmiyorsan toxicToPets ve toxicityNote null olsun.
- turkishName yaygın Türkçe adı olsun; yoksa bilimsel adı yaz. otherNames başka Türkçe adlar.
- waterSummerDays ve waterWinterDays iki sulama arasındaki gün sayısı; tempMinC ve tempMaxC bitkinin dayandığı sıcaklık aralığı (°C).
- commonProblems en çok beş kısa madde: belirti ve olası neden.
- Bitki koruma ürünü (zirai ilaç, fungisit, insektisit; neem yağı, arap sabunu, kükürt dahil) adı, doz, karışım oranı ya da uygulama zamanı yazma. Kimyasal gerekebilecek durumlarda "ziraat mühendisine danışın" de.`;
