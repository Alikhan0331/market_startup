import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsEnum, IsDateString, IsOptional, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignGoal, CampaignStatus } from '../entities/campaign.entity';
import { DealFormat } from '../../deals/entities/deal.entity';

export class UpdateCampaignDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: CampaignGoal }) @IsOptional() @IsEnum(CampaignGoal) goal?: CampaignGoal;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) budget?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() geo?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() deadline?: string;
  @ApiPropertyOptional({ enum: DealFormat }) @IsOptional() @IsEnum(DealFormat) format?: DealFormat;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
  @ApiPropertyOptional({ enum: CampaignStatus }) @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
}
