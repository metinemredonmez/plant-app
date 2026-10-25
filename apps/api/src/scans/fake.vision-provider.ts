import {
  type DiagnoseResult,
  type IdentifyResult,
  VisionProvider,
} from './vision-provider.js';

/**
 * Development and test stand-in: always the same plausible answer, no
 * network, no cost. env.ts forbids it in production.
 */
export class FakeVisionProvider extends VisionProvider {
  readonly name = 'fake';

  async identify(): Promise<IdentifyResult> {
    return {
      isPlant: true,
      suggestions: [
        {
          scientificName: 'Monstera deliciosa',
          commonNames: ['Deve tabanı'],
          probability: 0.94,
        },
        {
          scientificName: 'Epipremnum aureum',
          commonNames: ['Pothos'],
          probability: 0.03,
        },
        {
          scientificName: 'Philodendron bipinnatifidum',
          commonNames: [],
          probability: 0.01,
        },
      ],
    };
  }

  async diagnose(): Promise<DiagnoseResult> {
    return {
      isPlant: true,
      isHealthy: false,
      healthyProbability: 0.18,
      issues: [
        {
          name: 'overwatering',
          localName: 'Aşırı sulama',
          probability: 0.71,
          description:
            'Toprak uzun süre ıslak kaldığında kökler havasız kalır; alt yapraklar sararır, gövde dibi yumuşar.',
          biological: [
            'Toprak üst 3-5 cm kuruyana kadar sulamayı bırakın.',
            'Saksı altında biriken suyu boşaltın.',
          ],
          prevention: [
            'Drenaj delikli saksı ve havadar toprak kullanın.',
            'Sulamadan önce toprağı parmağınızla kontrol edin.',
          ],
        },
      ],
    };
  }
}
