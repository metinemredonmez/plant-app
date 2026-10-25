import { z } from 'zod';

import { email, newPassword } from '../users/users.schemas.js';

/** Accepts +90 5XX..., 0 5XX..., 90 5XX... or 5XX...; returns +905XXXXXXXXX. */
export function normalizeTurkishMobile(input: string) {
  const digits = input.replace(/\D/g, '');
  const national = digits.replace(/^(90|0)/, '');
  return `+90${national}`;
}

const phoneNumber = z
  .string()
  .transform(normalizeTurkishMobile)
  .pipe(
    z
      .string()
      .regex(/^\+905\d{9}$/, 'Geçerli bir Türkiye cep telefonu numarası girin'),
  );

const otp = z.string().regex(/^\d{5}$/, 'Kod 5 haneli olmalı');

// The resend buttons post the verify payload again, so extra keys (otp) are
// allowed on the send routes.
export const sendEmailSchema = z.looseObject({ email });
export const verifyEmailSchema = z.looseObject({ email, otp });
export const sendPhoneSchema = z.looseObject({ phoneNumber });
export const verifyPhoneSchema = z.looseObject({ phoneNumber, otp });

export const changePasswordSchema = z.object({
  email,
  password: newPassword,
  // Optional here so a missing token is a 401 (not a 422) in the service.
  resetToken: z.string().max(2000).optional(),
});

export type SendEmailBody = z.output<typeof sendEmailSchema>;
export type VerifyEmailBody = z.output<typeof verifyEmailSchema>;
export type SendPhoneBody = z.output<typeof sendPhoneSchema>;
export type VerifyPhoneBody = z.output<typeof verifyPhoneSchema>;
export type ChangePasswordBody = z.output<typeof changePasswordSchema>;
