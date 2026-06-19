import { Injectable } from '@nestjs/common';
import { YoutubeChannelResultDto } from './dto/youtube-channel-result.dto';

interface CacheEntry {
  data: YoutubeChannelResultDto;
  expiresAt: number;
}

@Injectable()
export class YoutubeCacheService {
  private cache = new Map<string, CacheEntry>();

  // TTL по умолчанию 6 часов (в миллисекундах)
  private readonly TTL_MS = 6 * 60 * 60 * 1000;

  get(key: string): YoutubeChannelResultDto | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: YoutubeChannelResultDto): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.TTL_MS,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}
