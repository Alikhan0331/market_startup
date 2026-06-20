import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { InfluencerProfile } from '../profiles/entities/influencer-profile.entity';
import { BrandProfile } from '../profiles/entities/brand-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InfluencerProfile, BrandProfile])],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
