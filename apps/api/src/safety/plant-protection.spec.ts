import { RED_TEAM, UNSAFE_REPLIES } from '../../test/fixtures/red-team.js';
import {
  asksForChemicals,
  EXPERT_REFERRAL,
  guardReply,
  mentionsExpert,
  redact,
  SAFE_FALLBACK,
  safeSteps,
  violations,
} from './plant-protection.js';

describe('plant protection guard', () => {
  it.each([
    ["Confidor'u seyreltip kullanın.", 'product'],
    ['İmidakloprid içeren bir ürün işe yarar.', 'product'],
    ['IMIDACLOPRID is effective against aphids.', 'product'],
    ['Bakır oksiklorür külleme için kullanılır.', 'product'],
    ['Göztaşı ve kireçle bordo bulamacı hazırlayın.', 'product'],
    ['Neem yağı doğal bir çözümdür.', 'product'],
    ['Toz kükürt serpebilirsiniz.', 'product'],
    ['Arap sabunlu su hazırlayın.', 'product'],
    ['Bacillus thuringiensis tırtıllara karşı etkilidir.', 'product'],
    ['Sprey® marka ürünü deneyin.', 'product'],
    ['1 litre suya 5 ml karıştırıp püskürtün.', 'dose'],
    ['Karışımı 2 ml/litre oranında hazırlayın.', 'dose'],
    ['Dekara 150 ml yeterlidir.', 'dose'],
    ['%1’lik çözelti hazırlayın.', 'dose'],
    ["%0,5'lik karışım yeterli olur.", 'dose'],
    ['Bir litre suya bir yemek kaşığı ekleyip sıkın.', 'dose'],
    [
      '5 litrelik pompaya 2 kapak koyun, sonra 1 litre suyla tamamlayın.',
      'dose',
    ],
    ['Mix 2 tablespoons per gallon of water.', 'dose'],
    ['Dozu 3 ml olmalı.', 'dose'],
    ['İlacı 7 gün arayla üç kez uygulayın.', 'timing'],
    ['Fungisiti 10-14 günde bir tekrarlayın.', 'timing'],
    ['Akşam serinliğinde ilaçlayın.', 'timing'],
    ['Hasattan 21 gün önce ilaçlamayı bırakın.', 'timing'],
    ['Apply the insecticide every 7 days.', 'timing'],
    ['Sistemik bir insektisit kullanın.', 'instruction'],
    ['Yapraklara fungisit püskürtün.', 'instruction'],
    ['Bitkiyi ilaçlayın.', 'instruction'],
    ['Spray a fungicide on the leaves.', 'instruction'],
  ])('flags %j as %s', (sentence, kind) => {
    expect(violations(sentence)).toContain(kind);
  });

  it.each([
    'Toprağın üst 3-5 cm’si kuruyunca sulayın.',
    'Bir seferde yaklaşık 1 litre su verin; küçük saksılarda 200 ml yeterli.',
    'Haftada bir sulayın; ilaç gerekmez.',
    'Yapraklara haftada iki kez su püskürtün.',
    'Sıvı gübreyi 1 litre suya 2 ml oranında, ayda bir verin.',
    'Kimyasal gübre kullanacaksanız dozu yarıya indirin.',
    'Sıcaklık 18-24 °C arasında kalsın.',
    'Kimyasal kullanmadan yaprakları nemli bir bezle silin.',
    'İlaç gerekiyorsa bir ziraat mühendisine danışın.',
    'Confidence is high: this looks like overwatering.',
    'Toprak kükürt gibi kokuyorsa kökler çürüyor olabilir.',
    'Yırtıcı akarlar kırmızı örümceği doğal yoldan azaltır.',
    'Hasta yaprakları kesip çöpe atın, kompostlamayın.',
    'Saksıyı 2-3 gün diğer bitkilerden ayırın.',
    EXPERT_REFERRAL,
    SAFE_FALLBACK,
  ])('lets %j through', (sentence) => {
    expect(violations(sentence)).toEqual([]);
  });

  it('drops only the bad sentences and keeps bullets', () => {
    const { text, removed } = redact(
      [
        'Yaprak bitleri için şunları yap:',
        '- Yaprakları duşta yıka. Sonra Decis sık.',
        '- Confidor kullan.',
        '- Karıncaları uzak tut.',
      ].join('\n'),
    );
    expect(removed).toBe(2);
    expect(text).toBe(
      [
        'Yaprak bitleri için şunları yap:',
        '- Yaprakları duşta yıka.',
        '- Karıncaları uzak tut.',
      ].join('\n'),
    );
  });

  it('drops a whole table when one row is bad', () => {
    const { text } = redact(
      'Plan:\n| İlaç | Doz |\n|---|---|\n| Abamektin | 50 ml/100 l |\nHavalandır.',
    );
    expect(text).toBe('Plan:\nHavalandır.');
  });

  it('cleans treatment steps one by one', () => {
    expect(
      safeSteps([
        'Neem yağı uygulayın.',
        'Hasta yaprakları kesin.',
        'Use copper fungicide every week.',
      ]),
    ).toEqual(['Hasta yaprakları kesin.']);
  });

  it('knows which questions are about chemicals', () => {
    for (const { prompt, kind } of RED_TEAM) {
      if (kind === 'borderline') continue;
      expect([prompt, asksForChemicals(prompt)]).toEqual([prompt, true]);
    }
    expect(asksForChemicals('Monstera kaç günde bir sulanır?')).toBe(false);
    expect(asksForChemicals('Nem oranı ne olmalı?')).toBe(false);
  });

  it('never lets a careless answer through', () => {
    RED_TEAM.forEach(({ prompt }, i) => {
      const reply = UNSAFE_REPLIES[i % UNSAFE_REPLIES.length];
      const guarded = guardReply(reply, prompt);
      expect(guarded.redacted).toBe(true);
      expect(violations(guarded.text)).toEqual([]);
      expect(mentionsExpert(guarded.text)).toBe(true);
    });
  });

  it('leaves a safe answer alone, adding the referral when chemicals were asked about', () => {
    const safe = 'Yaprakları nemli bir bezle silin ve bitkiyi ayırın.';
    expect(guardReply(safe, 'Yaprakları neden sararıyor?')).toEqual({
      text: safe,
      redacted: false,
    });
    expect(guardReply(safe, 'Hangi ilacı kullanayım?').text).toBe(
      `${safe}\n\n${EXPERT_REFERRAL}`,
    );
  });
});
