export type UserRole = 'BRAND' | 'INFLUENCER' | 'ADMIN' | 'MODERATOR';

export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'WARNING' | 'SUSPICIOUS';

export type AvailabilityStatus =
  | 'ACTIVELY_LOOKING'
  | 'CONSIDERING'
  | 'NOT_LOOKING'
  | 'BUSY';

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  ACTIVELY_LOOKING: 'Actively looking for deals',
  CONSIDERING: "I'm considering offers",
  NOT_LOOKING: 'I am not looking for deals',
  BUSY: 'I am busy',
};

export const AVAILABILITY_COLOR: Record<AvailabilityStatus, string> = {
  ACTIVELY_LOOKING: 'text-emerald-400 bg-emerald-400/10',
  CONSIDERING: 'text-amber-400 bg-amber-400/10',
  NOT_LOOKING: 'text-zinc-400 bg-zinc-400/10',
  BUSY: 'text-red-400 bg-red-400/10',
};

export type DealStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTERED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type DealFormat = 'STORY' | 'REEL' | 'POST' | 'VIDEO' | 'INTEGRATION';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface BrandProfile {
  id: string;
  userId: string;
  companyName: string;
  website?: string;
  industry: string;
  description?: string;
  logoUrl?: string;
  country: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InfluencerProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  country: string;
  city?: string;
  categories: string[];
  languages?: string[];
  priceFrom?: number;
  priceTo?: number;
  availabilityStatus: AvailabilityStatus;
  instagramHandle?: string;
  instagramFollowers: number;
  instagramER: number;
  instagramAvgReach: number;
  tiktokHandle?: string;
  tiktokFollowers: number;
  tiktokAvgViews: number;
  youtubeHandle?: string;
  youtubeSubscribers: number;
  youtubeAvgViews: number;
  youtubeLastSyncAt?: string;
  reachScore?: number;
  engagementScore?: number;
  audienceScore?: number;
  overallScore?: number;
  verificationStatus: VerificationStatus;
  reliabilityScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  brandId: string;
  influencerId: string;
  status: DealStatus;
  budget: number;
  format: DealFormat;
  description: string;
  deadline: string;
  counterBudget?: number;
  counterNote?: string;
  brandRating?: number | null;
  revisionCount?: number | null;
  noResponseWarnedAt?: string | null;
  brandAgreedAt?: string | null;
  influencerAgreedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  brand?: BrandProfile;
  influencer?: InfluencerProfile;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
