import { CardDrafter, type Drafted } from './card-drafter.js';

/** Development and test stand-in; env.ts forbids fake AI drivers in production. */
export class FakeCardDrafter extends CardDrafter {
  readonly name = 'fake';

  async draft(scientificName: string): Promise<Drafted> {
    return {
      card: {
        turkishName: `${scientificName.split(' ')[0]} (taslak)`,
        otherNames: [],
        family: null,
        light: 'BRIGHT_INDIRECT',
        difficulty: 'EASY',
        waterSummerDays: 7,
        waterWinterDays: 12,
        humidity: 'orta',
        tempMinC: 12,
        tempMaxC: 30,
        toxicToPets: null,
        toxicityNote: null,
        summary: `${scientificName} için test taslağı. Parlak, dolaylı ışığı sever.`,
        wateringTip: 'Toprağın üst 2-3 cm’si kuruyunca sulayın.',
        lightTip: 'Doğrudan öğle güneşinden koruyun.',
        fertilizingTip: 'İlkbahar ve yazda ayda bir sıvı gübre verin.',
        commonProblems: [
          'Sararan alt yapraklar: fazla sulama.',
          // A careless model's line; the guard must drop it.
          'Yaprak biti için Confidor sıkın.',
        ],
        spots: ['INDOOR'],
      },
    };
  }
}
