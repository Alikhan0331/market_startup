import { apiClient } from './client';
import { InfluencerProfile, AvailabilityStatus } from '../../types/api';

export const influencersApi = {
  getMe: (token: string) =>
    apiClient.get<InfluencerProfile>('/influencers/me', token),

  getById: (id: string, token?: string) =>
    apiClient.get<InfluencerProfile>(`/influencers/${id}`, token),

  createProfile: (data: Partial<InfluencerProfile>, token: string) =>
    apiClient.post<InfluencerProfile>('/influencers/profile', data, token),

  updateMe: (data: Partial<InfluencerProfile>, token: string) =>
    apiClient.put<InfluencerProfile>('/influencers/me', data, token),

  updateAvailability: (status: AvailabilityStatus, token: string) =>
    apiClient.patch<InfluencerProfile>('/influencers/me/availability', { availabilityStatus: status }, token),
};
