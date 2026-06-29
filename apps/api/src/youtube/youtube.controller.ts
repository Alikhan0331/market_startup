import { Controller, Post, Body, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { YoutubeService } from './youtube.service';
import { YoutubeOAuthService } from './youtube-oauth.service';
import { AnalyzeChannelDto } from './dto/analyze-channel.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../common/entities/user.entity';

@Controller('youtube')
export class YoutubeController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly youtubeOAuthService: YoutubeOAuthService,
  ) {}

  @Public()
  @Post('analyze')
  async analyze(@Body() dto: AnalyzeChannelDto) {
    return this.youtubeService.analyzeChannel(dto);
  }

  @Public()
  @Get('channel/:input')
  async getChannel(@Param('input') input: string) {
    return this.youtubeService.analyzeChannel({ input });
  }

  // GET /youtube/connect?state=JWT — редирект на Google OAuth
  @Public()
  @Get('connect')
  connect(@Query('state') state: string, @Res() res: Response) {
    const url = this.youtubeOAuthService.getAuthUrl(state);
    return res.redirect(url);
  }

  // GET /youtube/oauth-callback — callback от Google
  @Public()
  @Get('oauth-callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.youtubeOAuthService.handleCallback(code, state);
      return res.redirect(`${process.env.FRONTEND_URL}/profile?youtube=connected`);
    } catch (e: any) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/profile?youtube=error&msg=${encodeURIComponent(e.message)}`,
      );
    }
  }

  // GET /youtube/me — данные подключённого канала
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.youtubeOAuthService.getConnectedChannel(user.id);
  }
}
