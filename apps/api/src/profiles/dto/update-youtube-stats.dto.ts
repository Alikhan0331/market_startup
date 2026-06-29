import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class UpdateYoutubeStatsDto {
  @IsString()
  @IsOptional()
  youtubeHandle?: string;

  @IsString()
  youtubeChannelId: string;

  @IsNumber()
  @Min(0)
  youtubeSubscribers: number;

  @IsNumber()
  @Min(0)
  youtubeAvgViews: number;

  @IsNumber()
  @Min(0)
  youtubeMedianViews: number;

  @IsNumber()
  @Min(0)
  youtubeER: number;

  @IsNumber()
  @Min(0)
  youtubeVideoCount: number;

  @IsNumber()
  @Min(0)
  youtubeReachRate: number;

  @IsNumber()
  @Min(0)
  youtubeStabilityScore: number;
}
