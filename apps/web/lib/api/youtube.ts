import { apiClient } from './client';
import { InfluencerProfile } from '../../types/api';

export interface YoutubeChannelResult {
  channelId: string;
  title: string;
  handle: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  avgViews: number;
  medianViews: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  reachRate: number;
  stabilityScore: number;
  analyzedAt: string;
  analyzedVideosCount: number;
}

export const youtubeApi = {
  analyze: (input: string) =>
    apiClient.post<YoutubeChannelResult>('/youtube/analyze', { input }),

  saveToProfile: (data: YoutubeChannelResult, token: string) =>
    apiClient.patch<InfluencerProfile>('/influencers/me/youtube', {
      youtubeChannelId: data.channelId,
      youtubeSubscribers: data.subscribers,
      youtubeAvgViews: data.avgViews,
      youtubeMedianViews: data.medianViews,
      youtubeER: data.engagementRate,
      youtubeVideoCount: data.analyzedVideosCount,
      youtubeReachRate: data.reachRate,
      youtubeStabilityScore: data.stabilityScore,
    }, token),
};
