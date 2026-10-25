import { z } from 'zod';

import { PlantSpot } from '../generated/prisma/client.js';
import { CITIES } from './cities.js';

/**
 * Answers to the onboarding questions, all optional: "Geç" saves nothing
 * for that question, and an empty profile still counts as asked.
 */
export const careProfileSchema = z.object({
  experience: z
    .enum(['BEGINNER', 'SOME', 'EXPERIENCED'])
    .nullable()
    .default(null),
  spots: z
    .array(z.enum(PlantSpot))
    .max(3)
    .default([])
    .transform((spots) => [...new Set(spots)]),
  goals: z
    .array(z.enum(['IDENTIFY', 'REMIND', 'DIAGNOSE', 'LEARN']))
    .max(4)
    .default([])
    .transform((goals) => [...new Set(goals)]),
  pets: z.enum(['NONE', 'CAT', 'DOG', 'CAT_AND_DOG']).nullable().default(null),
  // Saved on the user (weather alerts), not in the profile.
  city: z
    .enum(CITIES, { error: 'Şehir 81 ilden biri olmalı' })
    .nullable()
    .optional(),
});
export type CareProfileBody = z.output<typeof careProfileSchema>;
export type CareProfile = Omit<CareProfileBody, 'city'>;

const EXPERIENCE: Record<string, string> = {
  BEGINNER: 'bitki bakımına yeni başlıyor',
  SOME: 'biraz deneyimli',
  EXPERIENCED: 'deneyimli',
};
const PETS: Record<string, string> = {
  CAT: 'evde kedi var',
  DOG: 'evde köpek var',
  CAT_AND_DOG: 'evde kedi ve köpek var',
};

/** One line about the owner for the assistant; null when nothing is known. */
export function ownerContext(profile: unknown): string | null {
  const parsed = careProfileSchema.safeParse(profile ?? {});
  if (!parsed.success) return null;
  const parts = [
    parsed.data.experience && EXPERIENCE[parsed.data.experience],
    parsed.data.pets && PETS[parsed.data.pets],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}
