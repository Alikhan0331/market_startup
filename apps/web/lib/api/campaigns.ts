import { apiClient } from './client';
import { InfluencerProfile } from '../../types/api';

export type CampaignGoal = 'REACH' | 'SALES' | 'AWARENESS';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type DealFormat = 'STORY' | 'REEL' | 'POST' | 'VIDEO' | 'INTEGRATION';

export interface Campaign {
  id: string;
  brandId: string;
  title: string;
  description?: string;
  goal: CampaignGoal;
  budget: number;
  geo?: string;
  deadline: string;
  format: DealFormat;
  isPublic: boolean;
  status: CampaignStatus;
  deals?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMatchBreakdown {
  nicheScore: number;
  geoScore: number;
  budgetScore: number;
  formatScore: number;
  qualityScore: number;
  reasons: string[];
}

export interface CampaignMatchResult {
  influencer: InfluencerProfile;
  matchScore: number;
  breakdown: CampaignMatchBreakdown;
}

export interface CreateCampaignDto {
  title: string;
  description?: string;
  goal: CampaignGoal;
  budget: number;
  geo?: string;
  deadline: string;
  format: DealFormat;
  isPublic?: boolean;
}

export const campaignsApi = {
  create: (data: CreateCampaignDto, token: string) =>
    apiClient.post<Campaign>('/campaigns', data, token),

  list: (token: string) =>
    apiClient.get<Campaign[]>('/campaigns/mine', token),

  getOne: (id: string, token: string) =>
    apiClient.get<Campaign>(`/campaigns/${id}`, token),

  update: (id: string, data: Partial<CreateCampaignDto & { status: CampaignStatus }>, token: string) =>
    apiClient.patch<Campaign>(`/campaigns/${id}`, data, token),

  remove: (id: string, token: string) =>
    apiClient.delete(`/campaigns/${id}`, token),

  getMatches: (id: string, token: string, limit = 20) =>
    apiClient.get<CampaignMatchResult[]>(`/campaigns/${id}/matches?limit=${limit}`, token),

  listPublic: () =>
    apiClient.get<Campaign[]>('/campaigns/public'),
};
