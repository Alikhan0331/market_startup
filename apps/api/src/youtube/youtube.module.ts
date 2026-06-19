import { Module } from '@nestjs/common';
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';
import { YoutubeApiService } from './youtube-api.service';
import { YoutubeCacheService } from './youtube-cache.service';

@Module({
  controllers: [YoutubeController],
  providers: [YoutubeService, YoutubeApiService, YoutubeCacheService],
  exports: [YoutubeService], // экспортируем чтобы другие модули могли использовать
})
export class YoutubeModule {}
