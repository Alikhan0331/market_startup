import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { InfluencerProfile } from '../profiles/entities/influencer-profile.entity';

@Injectable()
export class TiktokService {
  private readonly logger = new Logger(TiktokService.name);
  private readonly clientKey: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private config: ConfigService,
    private jwtService: JwtService,
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
  ) {
    this.clientKey = this.config.get<string>('TIKTOK_CLIENT_KEY')!;
    this.clientSecret = this.config.get<string>('TIKTOK_CLIENT_SECRET')!;
    this.redirectUri = this.config.get<string>('TIKTOK_REDIRECT_URI')!;
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      redirect_uri: this.redirectUri,
      scope: 'user.info.basic,user.info.stats,video.list',
      response_type: 'code',
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    if (!code) throw new BadRequestException('No code from TikTok');

    let userId: string;
    try {
      const payload = this.jwtService.verify(state) as { sub: string };
      userId = payload.sub;
    } catch {
      throw new BadRequestException('Invalid state token');
    }

    let tokenRes;
    try {
      this.logger.log(
        `TikTok token exchange: clientKey=${this.clientKey}, codeStart=${code?.substring(0, 15)}`,
      );
      tokenRes = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
    } catch (e: any) {
      const errData = e?.response?.data;
      const errMsg =
        typeof errData === 'object' ? JSON.stringify(errData) : String(errData);
      this.logger.error(`TikTok token error: ${errMsg}`);
      throw new Error(errMsg || e?.message || 'Token exchange failed');
    }

    const { access_token: accessToken, open_id: tiktokUserId } = tokenRes.data;

    const profileData = await this.fetchProfileData(accessToken);
    const videos = await this.fetchUserVideos(accessToken);
    const er = this.calculateER(videos, profileData.follower_count);

    await this.influencerRepo.update(
      { userId },
      {
        tiktokHandle: profileData.display_name,
        tiktokFollowers: profileData.follower_count ?? 0,
        tiktokAvgViews: this.calcAvgViews(videos),
        tiktokER: er,
        tiktokAccessToken: accessToken,
        tiktokUserId: tiktokUserId,
        tiktokLastSyncAt: new Date(),
      },
    );
  }

  async getTiktokData(userId: string) {
    const profile = await this.influencerRepo.findOne({
      where: { userId },
      select: [
        'tiktokHandle',
        'tiktokFollowers',
        'tiktokAvgViews',
        'tiktokER',
        'tiktokUserId',
        'tiktokLastSyncAt',
        'tiktokAccessToken',
      ],
    });
    if (!profile?.tiktokAccessToken) return { connected: false };

    try {
      const data = await this.fetchProfileData(profile.tiktokAccessToken);
      const videos = await this.fetchUserVideos(profile.tiktokAccessToken);
      const er = this.calculateER(videos, data.follower_count);
      return {
        connected: true,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        followerCount: data.follower_count,
        followingCount: data.following_count,
        likesCount: data.likes_count,
        videoCount: data.video_count,
        engagementRate: er,
        avgViews: this.calcAvgViews(videos),
        recentVideos: videos,
      };
    } catch {
      return { connected: false, error: 'Token expired or revoked' };
    }
  }

  private async fetchProfileData(accessToken: string) {
    const res = await axios.get(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.data.data.user;
  }

  private async fetchUserVideos(accessToken: string) {
    const res = await axios.post(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,title,view_count,like_count,comment_count,share_count,create_time',
      { max_count: 20 },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.data.data?.videos ?? [];
  }

  private calculateER(videos: any[], followerCount: number): number {
    if (!videos.length || !followerCount) return 0;
    const total = videos.reduce(
      (sum, v) =>
        sum +
        (v.like_count ?? 0) +
        (v.comment_count ?? 0) +
        (v.share_count ?? 0),
      0,
    );
    return parseFloat(
      ((total / videos.length / followerCount) * 100).toFixed(2),
    );
  }

  private calcAvgViews(videos: any[]): number {
    if (!videos.length) return 0;
    const total = videos.reduce((sum, v) => sum + (v.view_count ?? 0), 0);
    return Math.round(total / videos.length);
  }
}
