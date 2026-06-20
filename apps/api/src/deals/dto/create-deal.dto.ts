import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsEnum, IsDateString, IsUUID, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DealFormat } from '../entities/deal.entity';

export class CreateDealDto {
  @ApiProperty()
  @IsUUID()
  influencerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  budget: number;

  @ApiProperty({ enum: DealFormat })
  @IsEnum(DealFormat)
  format: DealFormat;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  deadline: string;
}
