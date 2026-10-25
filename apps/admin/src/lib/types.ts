export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface Me {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Overview {
  drafts: number;
  openReports: number;
  users: number;
  premium: number;
  todayUsd: number;
  limitUsd: number;
}

export interface SpeciesRow {
  id: number;
  scientificName: string;
  turkishName: string;
  status: 'DRAFT' | 'PUBLISHED';
  reviewed: boolean;
  source: string;
  updatedAt: string;
}

export interface Species extends SpeciesRow {
  otherNames: string[];
  synonyms: string[];
  family: string | null;
  light: string;
  difficulty: string;
  waterSummerDays: number;
  waterWinterDays: number;
  humidity: string;
  tempMinC: number;
  tempMaxC: number;
  toxicToPets: boolean | null;
  toxicityNote: string | null;
  summary: string;
  wateringTip: string;
  lightTip: string;
  fertilizingTip: string;
  commonProblems: string[];
  spots: string[];
  reviewedAt: string | null;
}

export interface Report {
  id: number;
  question: string | null;
  answer: string;
  reason: string | null;
  note: string | null;
  reportedAt: string;
  resolution: string | null;
  resolvedAt: string | null;
  user: string;
  plant: string | null;
}

export interface UserRow {
  id: number;
  publicId: string;
  name: string;
  email: string | null;
  role: Role;
  signInMethod: string | null;
  premium: boolean;
  createdAt: string;
  anonymizedAt: string | null;
}

export interface UserDetail extends Omit<UserRow, 'premium'> {
  city: string | null;
  subscription: {
    active: boolean;
    status: string;
    productId: string;
    store: string;
    sandbox: boolean;
    expiresAt: string | null;
    willRenew: boolean;
  } | null;
  used: Record<string, number>;
  limits: Record<string, number | null>;
  counts: { plants: number; scans: number; messages: number };
  consents: { kind: string; granted: boolean; textVersion: string; createdAt: string }[];
}

export interface CostDay {
  day: string;
  totalUsd: number;
  calls: number;
  tasks: Record<string, { calls: number; costUsd: number; tokens: number }>;
}

export interface Costs {
  todayUsd: number;
  limitUsd: number;
  days: CostDay[];
  prices: {
    claude: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }>;
    kindwisePerCall: number;
  };
}

export interface AuditEntry {
  id: number;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}
