import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';

@Injectable()
export class YoutubeApiService {
  private readonly youtube: youtube_v3.Youtube;
  private readonly logger = new Logger(YoutubeApiService.name);

  constructor(private config: ConfigService) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.config.get<string>('YOUTUBE_API_KEY'),
    });
  }

  // Получить канал по @handle, имени или channelId
async getChannel(input: string): Promise<youtube_v3.Schema$Channel | null> {
  try {
    const normalized = input.replace('@', '').trim();

    // Если передан Channel ID
    const isChannelId =
      normalized.startsWith('UC') && normalized.length > 20;

    if (isChannelId) {
      const channelRes = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [normalized],
      });

      return channelRes.data.items?.[0] ?? null;
    }

    // Ищем канал через Search API
    const searchRes = await this.youtube.search.list({
      part: ['snippet'],
      q: normalized,
      type: ['channel'],
      maxResults: 1,
    });

    const channelId =
      searchRes.data.items?.[0]?.snippet?.channelId;

    if (!channelId) {
      return null;
    }

    const channelRes = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [channelId],
    });

    return channelRes.data.items?.[0] ?? null;
  } catch (e) {
    this.logger.error('getChannel error', e);
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
