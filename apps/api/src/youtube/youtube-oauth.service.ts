import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { google } from 'googleapis';
import { InfluencerProfile } from '../profiles/entities/influencer-profile.entity';

@Injectable()
export class YoutubeOAuthService {
  private readonly logger = new Logger(YoutubeOAuthService.name);

  constructor(
    private config: ConfigService,
    private jwtService: JwtService,
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
  ) {}

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      this.config.get<string>('YOUTUBE_OAUTH_REDIRECT_URI'),
    );
  }

  getAuthUrl(state: string): string {
    const client = this.createOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube.readonly'],
      state,
      prompt: 'select_account',
    });
  }

  async handleCallback(code: string, state: string): Promise<void> {
    if (!code) throw new BadRequestException('No code from Google');

    let userId: string;
    try {
      const payload = this.jwtService.verify(state) as { sub: string };
      userId = payload.sub;
    } catch {
      throw new BadRequestException('Invalid state token');
    }

    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const youtube = google.youtube({ version: 'v3', auth: client });
    const channelsRes = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true,
    });

    const channel = channelsRes.data.items?.[0];
    if (!channel) throw new BadRequestException('No YouTube channel found for this Google account');

    const subscribers = Number(channel.statistics?.subscriberCount ?? 0);
    const uploadPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    // Fetch recent videos to calculate ER and avg views
    let youtubeER = 0;
    let youtubeAvgViews = 0;
    let youtubeMedianViews = 0;
    let youtubeVideoCount = Number(channel.statistics?.videoCount ?? 0);

    if (uploadPlaylistId) {
      try {
        const videosRes = await youtube.playlistItems.list({
          part: ['contentDetails'],
          playlistId: uploadPlaylistId,
          maxResults: 20,
        });
        const videoIds = (videosRes.data.items ?? [])
          .map((i) => i.contentDetails?.videoId)
          .filter(Boolean) as string[];

        if (videoIds.length > 0) {
          const statsRes = await youtube.videos.list({
            part: ['statistics'],
            id: videoIds,
          });
          const videos = statsRes.data.items ?? [];
          const views = videos.map((v) => Number(v.statistics?.viewCount ?? 0));
          const likes = videos.map((v) => Number(v.statistics?.likeCount ?? 0));
          const comments = videos.map((v) => Number(v.statistics?.commentCount ?? 0));

          const avgViews = views.reduce((a, b) => a + b, 0) / views.length;
          const avgLikes = likes.reduce((a, b) => a + b, 0) / likes.length;
          const avgComments = comments.reduce((a, b) => a + b, 0) / comments.length;

          youtubeAvgViews = Math.round(avgViews);
          youtubeER = avgViews > 0
            ? Number(((avgLikes + avgComments) / avgViews * 100).toFixed(2))
            : 0;

          const sorted = [...views].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          youtubeMedianViews = sorted.length % 2
            ? sorted[mid]
            : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to fetch video stats: ${e.message}`);
      }
    }

    await this.influencerRepo.update(
      { userId },
      {
        youtubeHandle: channel.snippet?.customUrl ?? channel.snippet?.title ?? '',
        youtubeChannelId: channel.id ?? '',
        youtubeSubscribers: subscribers,
        youtubeAvgViews,
        youtubeMedianViews,
        youtubeER,
        youtubeVideoCount,
        youtubeLastSyncAt: new Date(),
      },
    );

    this.logger.log(`YouTube connected for user ${userId}: ${channel.snippet?.title}`);
  }

  async getConnectedChannel(userId: string) {
    const profile = await this.influencerRepo.findOne({ where: { userId } });
    if (!profile?.youtubeChannelId) return { connected: false };
    return {
      connected: true,
      channelId: profile.youtubeChannelId,
      handle: profile.youtubeHandle,
      subscribers: profile.youtubeSubscribers,
      avgViews: profile.youtubeAvgViews,
      er: profile.youtubeER,
      lastSyncAt: profile.youtubeLastSyncAt,
    };
  }
}
