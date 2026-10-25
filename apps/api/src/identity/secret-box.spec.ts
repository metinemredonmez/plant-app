import { randomBytes } from 'node:crypto';

import { SecretBox } from './secret-box.js';

describe('SecretBox', () => {
  const key = randomBytes(32).toString('base64');

  it('opens what it sealed, with a new IV every time', () => {
    const box = new SecretBox(key);
    const a = box.seal('apple-refresh-token');
    expect(a).not.toContain('apple-refresh-token');
    expect(box.seal('apple-refresh-token')).not.toBe(a);
    expect(box.open(a)).toBe('apple-refresh-token');
  });

  it('refuses a tampered box and a wrong key', () => {
    const box = new SecretBox(key);
    const [iv, tag, data] = box.seal('x').split('.');
    expect(() => box.open([iv, tag, `${data}A`].join('.'))).toThrow();
    expect(() =>
      new SecretBox(randomBytes(32).toString('base64')).open(box.seal('x')),
    ).toThrow();
    expect(() => new SecretBox('short')).toThrow(/32 bytes/);
  });
});
