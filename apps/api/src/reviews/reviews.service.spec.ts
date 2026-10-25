import { reviewerName } from './reviews.service.js';

describe('reviewerName', () => {
  it('publishes the first name and the last-name initial', () => {
    expect(reviewerName({ name: 'Ayşe Yılmaz', anonymizedAt: null })).toBe(
      'Ayşe Y.',
    );
  });

  it('upper-cases the initial the Turkish way', () => {
    expect(reviewerName({ name: 'Can ince', anonymizedAt: null })).toBe(
      'Can İ.',
    );
  });

  it('uses the last word for compound names', () => {
    expect(reviewerName({ name: 'Mehmet Ali Kaya', anonymizedAt: null })).toBe(
      'Mehmet K.',
    );
  });

  it('keeps a single name as it is', () => {
    expect(reviewerName({ name: 'Deniz', anonymizedAt: null })).toBe('Deniz');
  });

  it('hides deleted accounts', () => {
    expect(
      reviewerName({ name: 'Silinmiş kullanıcı', anonymizedAt: new Date() }),
    ).toBe('Eski müşteri');
  });
});
