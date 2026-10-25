import { Logger } from '@nestjs/common';

import {
  type DiagnoseResult,
  type IdentifyResult,
  type Issue,
  type ScanImage,
  VisionProvider,
  VisionProviderError,
} from './vision-provider.js';

export interface KindwiseConfig {
  apiKey: string;
  /** Overridable for tests. */
  baseUrl?: string;
}

interface Suggestion {
  name?: string;
  probability?: number;
  details?: Record<string, unknown>;
}

interface KindwiseResponse {
  result?: {
    is_plant?: { binary?: boolean; probability?: number };
    is_healthy?: { binary?: boolean; probability?: number };
    classification?: { suggestions?: Suggestion[] };
    disease?: { suggestions?: Suggestion[] };
  };
}

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

/**
 * Kindwise plant.id v3: `POST /api/v3/identification` and
 * `/api/v3/health_assessment`, `Api-Key` header, base64 images, as in the
 * official client (flowerchecker/kindwise-api-client). Not yet run against
 * the live API; see docs/adr.
 */
export class KindwiseVisionProvider extends VisionProvider {
  readonly name = 'kindwise';
  private readonly logger = new Logger('Kindwise');

  constructor(private readonly config: KindwiseConfig) {
    super();
  }

  private async post(path: string, details: string, image: ScanImage) {
    const baseUrl = this.config.baseUrl ?? 'https://plant.id';
    const url = `${baseUrl}${path}?details=${details}&language=tr`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [image.data.toString('base64')],
        similar_images: false,
      }),
      signal: AbortSignal.timeout(20_000),
    }).catch((error: unknown) => {
      throw new VisionProviderError(`Kindwise unreachable: ${String(error)}`);
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `${path} HTTP ${response.status}: ${text.slice(0, 200)}`,
      );
      throw new VisionProviderError(`Kindwise HTTP ${response.status}`);
    }
    return (await response.json()) as KindwiseResponse;
  }

  async identify(image: ScanImage): Promise<IdentifyResult> {
    const body = await this.post(
      '/api/v3/identification',
      'common_names',
      image,
    );
    const result = body.result ?? {};
    return {
      isPlant: result.is_plant?.binary ?? true,
      suggestions: (result.classification?.suggestions ?? [])
        .filter((s) => typeof s.name === 'string')
        .slice(0, 3)
        .map((s) => ({
          scientificName: s.name!,
          commonNames: strings(s.details?.common_names),
          probability: s.probability ?? 0,
        })),
    };
  }

  /**
   * Treatments are reduced to the biological and preventive steps. Chemical
   * treatments are dropped on purpose: in Türkiye licensed plant protection
   * products are prescription-only (ziraat mühendisi) and may not be
   * promoted online (regulations of 13 Dec 2025, RG 33106).
   */
  async diagnose(image: ScanImage): Promise<DiagnoseResult> {
    const body = await this.post(
      '/api/v3/health_assessment',
      'local_name,description,treatment',
      image,
    );
    const result = body.result ?? {};
    const issues: Issue[] = (result.disease?.suggestions ?? [])
      .filter((s) => typeof s.name === 'string' && (s.probability ?? 0) >= 0.1)
      .slice(0, 3)
      .map((s) => {
        const treatment = (s.details?.treatment ?? {}) as Record<
          string,
          unknown
        >;
        const localName = s.details?.local_name;
        const description = s.details?.description;
        return {
          name: s.name!,
          localName: typeof localName === 'string' ? localName : undefined,
          probability: s.probability ?? 0,
          description:
            typeof description === 'string' ? description : undefined,
          biological: strings(treatment.biological),
          prevention: strings(treatment.prevention),
        };
      });
    return {
      isPlant: result.is_plant?.binary ?? true,
      isHealthy: result.is_healthy?.binary ?? issues.length === 0,
      healthyProbability: result.is_healthy?.probability ?? 0,
      issues,
    };
  }
}
