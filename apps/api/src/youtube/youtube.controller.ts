import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { AnalyzeChannelDto } from './dto/analyze-channel.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

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
}
