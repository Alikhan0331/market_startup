import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';

@Injectable()
export class YoutubeApiService {
  private readonly youtube: youtube_v3.Youtube;
  private readonly logger = new Logger(YoutubeApiService.name);

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('YOUTUBE_API_KEY');
    if (!key) this.logger.error('YOUTUBE_API_KEY is not set in .env!');
    else this.logger.log(`YOUTUBE_API_KEY loaded (${key.slice(0, 8)}...)`);
    this.youtube = google.youtube({ version: 'v3', auth: key });
  }

  // Получить канал по @handle или по channelId
  async getChannel(input: string): Promise<youtube_v3.Schema$Channel | null> {
    try {
      const isChannelId = input.startsWith('UC') && input.length > 20;
      const params: youtube_v3.Params$Resource$Channels$List = {
        part: ['snippet', 'statistics', 'contentDetails'],
      };

      if (isChannelId) {
        params.id = [input];
      } else {
        // убираем @ если есть
        params.forHandle = input.replace('@', '');
      }

      const res = await this.youtube.channels.list(params);
      return res.data.items?.[0] ?? null;
    } catch (e: any) {
      this.logger.error(`getChannel error ${e?.response?.status}: ${e?.response?.data?.error?.message ?? e?.message}`);
      return null;
    }
  }

  // Получить последние N видео из uploads-плейлиста
  async getRecentVideoIds(
    uploadPlaylistId: string,
    maxItems = 20,
  ): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;

    while (ids.length < maxItems) {
      const res = await this.youtube.playlistItems.list({
        part: ['contentDetails'],
        playlistId: uploadPlaylistId,
        maxResults: Math.min(50, maxItems - ids.length),
        pageToken,
      });

      for (const item of res.data.items ?? []) {
        if (item.contentDetails?.videoId) {
          ids.push(item.contentDetails.videoId);
        }
      }

      pageToken = res.data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    return ids;
  }

  // Получить статистику по списку videoId (до 50 за раз)
  async getVideosStats(videoIds: string[]): Promise<youtube_v3.Schema$Video[]> {
    const results: youtube_v3.Schema$Video[] = [];

    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const res = await this.youtube.videos.list({
        part: ['statistics'],
        id: chunk,
        maxResults: 50,
      });
      results.push(...(res.data.items ?? []));
    }

    return results;
  }
}
