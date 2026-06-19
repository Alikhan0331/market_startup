export class YoutubeChannelResultDto {
  channelId: string;
  title: string;
  handle: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;

  // Метрики по последним видео
  avgViews: number;
  medianViews: number;
  avgLikes: number;
  avgComments: number;

  // Расчётные показатели
  engagementRate: number; // (likes + comments) / views * 100
  reachRate: number; // medianViews / subscribers * 100
  stabilityScore: number; // 0–10

  // Когда посчитано
  analyzedAt: Date;
  analyzedVideosCount: number;
}
