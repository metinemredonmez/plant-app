export interface ScanImage {
  data: Buffer;
  mimeType: string;
}

export interface IdentifyResult {
  isPlant: boolean;
  suggestions: {
    scientificName: string;
    commonNames: string[];
    probability: number;
  }[];
}

export interface Issue {
  name: string;
  /** Name in Turkish when the provider has one. */
  localName?: string;
  probability: number;
  description?: string;
  /** Non-chemical steps only; see `KindwiseVisionProvider.diagnose`. */
  biological: string[];
  prevention: string[];
}

export interface DiagnoseResult {
  isPlant: boolean;
  isHealthy: boolean;
  healthyProbability: number;
  issues: Issue[];
}

/** Plant identification and health assessment from a photo. */
export abstract class VisionProvider {
  abstract readonly name: 'fake' | 'kindwise';
  abstract identify(image: ScanImage): Promise<IdentifyResult>;
  abstract diagnose(image: ScanImage): Promise<DiagnoseResult>;
}

/** The provider could not be reached or rejected the request. */
export class VisionProviderError extends Error {}
