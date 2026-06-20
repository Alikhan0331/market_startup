import { apiClient } from './client';
import { Deal, DealFormat } from '../../types/api';

export const dealsApi = {
  list: (token: string) => apiClient.get<Deal[]>('/deals', token),

  getById: (id: string, token: string) => apiClient.get<Deal>(`/deals/${id}`, token),

  create: (
    data: {
      influencerId: string;
      campaignId?: string;
      budget: number;
      format: DealFormat;
      description: string;
      deadline: string;
    },
    token: string,
  ) => apiClient.post<Deal>('/deals', data, token),

  accept: (id: string, token: string) =>
    apiClient.patch<Deal>(`/deals/${id}/accept`, {}, token),

  reject: (id: string, token: string) =>
    apiClient.patch<Deal>(`/deals/${id}/reject`, {}, token),

  counter: (
    id: string,
    data: { counterBudget: number; counterNote?: string },
    token: string,
  ) => apiClient.patch<Deal>(`/deals/${id}/counter`, data, token),

  complete: (id: string, token: string) =>
    apiClient.patch<Deal>(`/deals/${id}/complete`, {}, token),

  cancel: (id: string, token: string) =>
    apiClient.patch<Deal>(`/deals/${id}/cancel`, {}, token),
};
