import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { YoutubeApiService } from './youtube-api.service';
import { YoutubeCacheService } from './youtube-cache.service';
import { AnalyzeChannelDto } from './dto/analyze-channel.dto';
import { YoutubeChannelResultDto } from './dto/youtube-channel-result.dto';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(
    private readonly apiService: YoutubeApiService,
    private readonly cacheService: YoutubeCacheService,
  ) {}

  async analyzeChannel(
    dto: AnalyzeChannelDto,
  ): Promise<YoutubeChannelResultDto> {
    const input = this.normalizeInput(dto.input);
    const videoCount = dto.videoCount ?? 20;

    // Проверяем кэш
    const cached = this.cacheService.get(input);
    if (cached) {
      this.logger.log(`Cache hit: ${input}`);
      return cached;
    }

    // Получаем канал
    const channel = await this.apiService.getChannel(input);
    if (!channel) {
      throw new BadRequestException(`Канал не найден: ${dto.input}`);
    }

    const uploadPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadPlaylistId) {
      throw new BadRequestException('Не удалось получить плейлист канала');
    }

    // Получаем видео и их статистику
    const videoIds = await this.apiService.getRecentVideoIds(
      uploadPlaylistId,
      videoCount,
    );
    const videos = await this.apiService.getVideosStats(videoIds);

    // Считаем метрики
    const result = this.computeMetrics(channel, videos);

    // Кэшируем
    this.cacheService.set(input, result);

    return result;
  }

  private computeMetrics(channel: any, videos: any[]): YoutubeChannelResultDto {
    const subscribers = Number(channel.statistics?.subscriberCount ?? 0);
    const totalViews = Number(channel.statistics?.viewCount ?? 0);

    const views = videos.map((v) => Number(v.statistics?.viewCount ?? 0));
    const likes = videos.map((v) => Number(v.statistics?.likeCount ?? 0));
    const comments = videos.map((v) => Number(v.statistics?.commentCount ?? 0));

    const avgViews = this.avg(views);
    const medianViews = this.median(views);
    const avgLikes = this.avg(likes);
    const avgComments = this.avg(comments);

    // ER = (likes + comments) / views * 100
    const engagementRate =
      avgViews > 0 ? ((avgLikes + avgComments) / avgViews) * 100 : 0;

    // Охват = medianViews / subscribers * 100
    const reachRate = subscribers > 0 ? (medianViews / subscribers) * 100 : 0;

    // Стабильность: чем ниже коэффициент вариации, тем выше скор
    const stabilityScore = this.computeStability(views);

    return {
      channelId: channel.id,
      title: channel.snippet?.title ?? '',
      handle: channel.snippet?.customUrl ?? '',
      subscribers,
      totalViews,
      videoCount: Number(channel.statistics?.videoCount ?? 0),
      avgViews: Math.round(avgViews),
      medianViews: Math.round(medianViews),
      avgLikes: Math.round(avgLikes),
      avgComments: Math.round(avgComments),
      engagementRate: Number(engagementRate.toFixed(2)),
      reachRate: Number(reachRate.toFixed(2)),
      stabilityScore: Number(stabilityScore.toFixed(2)),
      analyzedAt: new Date(),
      analyzedVideosCount: videos.length,
    };
  }

  private normalizeInput(input: string): string {
    // Вытащить handle из полного URL youtube.com/@handle
    const urlMatch = input.match(/youtube\.com\/@?([\w-]+)/);
    if (urlMatch) return urlMatch[1];
    return input.trim().replace('@', '');
  }

  private avg(arr: number[]): number {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private median(arr: number[]): number {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private computeStability(views: number[]): number {
    if (views.length < 2) return 5;
    const mean = this.avg(views);
    if (mean === 0) return 0;
    const variance =
      views.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / views.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // коэффициент вариации
    // cv=0 → скор 10, cv>=1 → скор 0
    return Math.max(0, Math.min(10, (1 - cv) * 10));
  }
}
