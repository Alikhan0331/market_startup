import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { InfluencerProfile } from '../profiles/entities/influencer-profile.entity';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;

  constructor(
    private config: ConfigService,
    private jwtService: JwtService,
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
  ) {
    this.appId = this.config.get<string>('INSTAGRAM_APP_ID')!;
    this.appSecret = this.config.get<string>('INSTAGRAM_APP_SECRET')!;
    this.redirectUri = this.config.get<string>('INSTAGRAM_REDIRECT_URI')!;
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: 'instagram_business_basic,instagram_business_content_publish',
      response_type: 'code',
      state,
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }
  async handleCallback(code: string, state: string): Promise<void> {
    if (!code) throw new BadRequestException('No code from Instagram');

    // Декодируем state чтобы получить userId
    let userId: string;
    try {
      const payload = this.jwtService.verify(state) as { sub: string };
      userId = payload.sub;
    } catch {
      throw new BadRequestException('Invalid state token');
    }

    // Меняем code на short-lived access token
    let tokenRes;
    try {
      this.logger.log(
        `Sending to Instagram: appId=${this.appId}, redirectUri=${this.redirectUri}, codeStart=${code?.substring(0, 15)}`,
      );
      tokenRes = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        new URLSearchParams({
          client_id: this.appId,
          client_secret: this.appSecret,
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
      this.logger.error(`Instagram 400 detail: ${errMsg}`);
      this.logger.error(`Instagram error message: ${e?.message}`);
      this.logger.error(
        `Instagram response text: ${JSON.stringify(e?.response?.data)}`,
      );
      throw new Error(errMsg || e?.message || 'Token exchange failed');
    }
    const { access_token: shortToken, user_id: igUserId } = tokenRes.data;

    // Меняем short-lived на long-lived token (60 дней)
    const longRes = await axios.get(
      'https://graph.instagram.com/access_token',
      {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.appSecret,
          access_token: shortToken,
        },
      },
    );
    const longToken: string = longRes.data.access_token;

    // Получаем данные профиля
    const profileData = await this.fetchProfileData(longToken, igUserId);

    // Сохраняем в БД
    await this.influencerRepo.update(
      { userId },
      {
        instagramHandle: profileData.username,
        instagramFollowers: profileData.followers_count ?? 0,
        instagramAccessToken: longToken,
        instagramUserId: String(igUserId),
        instagramLastSyncAt: new Date(),
      },
    );
  }

  async getInstagramData(userId: string) {
    const profile = await this.influencerRepo.findOne({ where: { userId } });
    if (!profile?.instagramAccessToken) return { connected: false };

    try {
      const data = await this.fetchProfileData(
        profile.instagramAccessToken,
        profile.instagramUserId!,
      );
      return { connected: true, ...data };
    } catch {
      return { connected: false, error: 'Token expired' };
    }
  }

  private async fetchProfileData(
    accessToken: string,
    igUserId: string | number,
  ) {
    const res = await axios.get(`https://graph.instagram.com/${igUserId}`, {
      params: {
        fields:
          'id,username,account_type,media_count,followers_count,biography,profile_picture_url',
        access_token: accessToken,
      },
    });
    return res.data;
  }
}
