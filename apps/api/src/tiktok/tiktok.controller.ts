import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { TiktokService } from './tiktok.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../common/entities/user.entity';

@Controller('tiktok')
export class TiktokController {
  constructor(private readonly tiktokService: TiktokService) {}

  // GET /tiktok/connect?state=JWT_TOKEN
  // Фронтенд редиректит сюда с JWT токеном пользователя в state
  @Public()
  @Get('connect')
  connect(@Query('state') state: string, @Res() res: Response) {
    const url = this.tiktokService.getAuthUrl(state);
    return res.redirect(url);
  }

  // GET /tiktok/callback?code=...&state=...
  // TikTok редиректит сюда после согласия пользователя
  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.tiktokService.handleCallback(code, state);
      return res.redirect(
        `${process.env.FRONTEND_URL}/profile?tiktok=connected`,
      );
    } catch (e: any) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/profile?tiktok=error&msg=${encodeURIComponent(e.message)}`,
      );
    }
  }

  // GET /tiktok/me  — требует JWT авторизации
  // Возвращает данные TikTok текущего пользователя
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.tiktokService.getTiktokData(user.id);
  }
}
