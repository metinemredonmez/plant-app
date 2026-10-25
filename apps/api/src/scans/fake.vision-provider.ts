import sharp from 'sharp';

import {
  type DiagnoseResult,
  type IdentifyResult,
  type ScanImage,
  VisionProvider,
} from './vision-provider.js';

/** Share of clearly green pixels in a 32×32 thumbnail. */
async function greenShare(image: ScanImage) {
  const pixels = await sharp(image.data)
    .resize(32, 32, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
  let green = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    if (g > r + 15 && g > b + 15) green += 1;
  }
  return green / (pixels.length / 3);
}

/**
 * Development and test stand-in: no network, no cost. Any photo with some
 * green in it is a Monstera; a photo without green is "not a plant", so the
 * app's "Bitki tanınamadı" screen can be tried too. env.ts forbids it in
 * production.
 */
export class FakeVisionProvider extends VisionProvider {
  readonly name = 'fake';

  private async isPlant(image: ScanImage) {
    return (await greenShare(image)) >= 0.05;
  }

  async identify(image: ScanImage): Promise<IdentifyResult> {
    if (!(await this.isPlant(image)))
      return { isPlant: false, suggestions: [] };
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

  async diagnose(image: ScanImage): Promise<DiagnoseResult> {
    if (!(await this.isPlant(image))) {
      return {
        isPlant: false,
        isHealthy: false,
        healthyProbability: 0,
        issues: [],
      };
    }
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
