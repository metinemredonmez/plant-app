import { createHmac } from 'node:crypto';

/**
 * A Turkish mobile number as +905XXXXXXXXX, or null. Accepts the usual ways
 * people type it: "0532 123 45 67", "532-123-4567", "+90 532 1234567".
 * Only +90 mobiles: SMS costs and abuse are capped per country.
 */
export function turkishMobile(input: string): string | null {
  let digits = input.replace(/[\s().-]/g, '');
  if (digits.startsWith('+90')) digits = digits.slice(3);
  else if (digits.startsWith('0090')) digits = digits.slice(4);
  else if (digits.startsWith('90') && digits.length === 12)
    digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return /^5\d{9}$/.test(digits) ? `+90${digits}` : null;
}

/** HMAC of the number: what is stored and looked up, never the number. */
export const phoneHash = (pepper: string, e164: string) =>
  createHmac('sha256', pepper).update(e164).digest('hex');

/** "•••• ••• •• 67" from the last two digits. */
export const maskedPhone = (lastTwo: string) => `•••• ••• •• ${lastTwo}`;
