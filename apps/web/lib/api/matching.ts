import { apiClient } from './client';
import { InfluencerProfile } from '../../types/api';

export interface MatchBreakdown {
  categoryScore: number;
  countryScore: number;
  engagementScore: number;
  budgetScore: number;
  verificationScore: number;
  matchedCategories: string[];
  reasons: string[];
}

export interface MatchResult {
  influencer: InfluencerProfile;
  matchScore: number;
  breakdown: MatchBreakdown;
}

export const matchingApi = {
  getRecommended: (limit = 20, token?: string): Promise<MatchResult[]> =>
    apiClient.get<MatchResult[]>(`/matching/recommended?limit=${limit}`, token),
};
