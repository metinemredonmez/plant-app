import { z } from 'zod';

// Server-side rules for the legacy user endpoints. Names accept Turkish
// letters (the app's own regex does not yet, see week 4).

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const name = z.string().trim().min(2).max(80);

export const signUpSchema = z.object({
  name,
  email,
  // NIST SP 800-63B: at least 8 characters, long passphrases allowed.
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z.object({
  name,
  location: z.string().trim().max(200),
});

export type SignUpBody = z.output<typeof signUpSchema>;
export type LoginBody = z.output<typeof loginSchema>;
export type UpdateProfileBody = z.output<typeof updateProfileSchema>;
