import { z } from 'zod';

// Server-side rules for the legacy user endpoints. Names accept Turkish
// letters, as the app's own validation does since week 4.

export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const name = z.string().trim().min(2).max(80);
/** NIST SP 800-63B: at least 8 characters, long passphrases allowed. */
export const newPassword = z.string().min(8).max(128);

export const signUpSchema = z.object({
  name,
  email,
  password: newPassword,
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
