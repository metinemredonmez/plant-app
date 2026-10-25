import {
  normalizeTurkishMobile,
  sendPhoneSchema,
} from './verification.schemas.js';

describe('normalizeTurkishMobile', () => {
  it.each([
    '+905551112233',
    '905551112233',
    '05551112233',
    '5551112233',
    '0 (555) 111 22 33',
  ])('%s → +905551112233', (input) => {
    expect(normalizeTurkishMobile(input)).toBe('+905551112233');
  });

  it('rejects landlines and foreign numbers', () => {
    expect(
      sendPhoneSchema.safeParse({ phoneNumber: '02161112233' }).success,
    ).toBe(false);
    expect(
      sendPhoneSchema.safeParse({ phoneNumber: '+4915123456789' }).success,
    ).toBe(false);
  });
});
