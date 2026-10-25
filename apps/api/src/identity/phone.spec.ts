import { maskedPhone, phoneHash, turkishMobile } from './phone.js';

describe('turkishMobile', () => {
  it.each([
    ['0532 123 45 67', '+905321234567'],
    ['532-123-4567', '+905321234567'],
    ['+90 532 1234567', '+905321234567'],
    ['00905321234567', '+905321234567'],
    ['905321234567', '+905321234567'],
    ['(0532) 123 45 67', '+905321234567'],
  ])('reads %s', (input, e164) => {
    expect(turkishMobile(input)).toBe(e164);
  });

  it.each([
    ['0212 123 45 67'], // landline
    ['+44 7700 900123'], // not +90
    ['0532 123 45'], // too short
    ['0532 123 45 678'], // too long
    ['bir iki üç'],
  ])('refuses %s', (input) => {
    expect(turkishMobile(input)).toBeNull();
  });
});

describe('phoneHash and maskedPhone', () => {
  it('hashes with the pepper and masks all but two digits', () => {
    const a = phoneHash('p'.repeat(32), '+905321234567');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('5321234567');
    expect(phoneHash('q'.repeat(32), '+905321234567')).not.toBe(a);
    expect(maskedPhone('67')).toBe('•••• ••• •• 67');
  });
});
