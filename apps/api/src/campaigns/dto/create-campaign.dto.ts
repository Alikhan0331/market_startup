import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsInt, IsEnum, IsDateString, IsOptional, IsBoolean, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignGoal } from '../entities/campaign.entity';
import { DealFormat } from '../../deals/entities/deal.entity';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CampaignGoal })
  @IsEnum(CampaignGoal)
  goal: CampaignGoal;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  budget: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  geo?: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ enum: DealFormat })
  @IsEnum(DealFormat)
  format: DealFormat;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
