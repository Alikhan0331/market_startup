import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandProfile } from './entities/brand-profile.entity';
import { InfluencerProfile, AvailabilityStatus } from './entities/influencer-profile.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { UpdateYoutubeStatsDto } from './dto/update-youtube-stats.dto';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(BrandProfile)
    private brandRepo: Repository<BrandProfile>,
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
    private scoringService: ScoringService,
  ) {}

  // --- Brand ---

  async createBrandProfile(userId: string, dto: CreateBrandDto): Promise<BrandProfile> {
    const existing = await this.brandRepo.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Brand profile already exists');
    const profile = this.brandRepo.create({ ...dto, userId });
    return this.brandRepo.save(profile);
  }

  async getMyBrandProfileOrNull(userId: string): Promise<BrandProfile | null> {
    return this.brandRepo.findOne({ where: { userId } });
  }

  async getMyBrandProfile(userId: string): Promise<BrandProfile> {
    const profile = await this.brandRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Brand profile not found');
    return profile;
  }

  async upsertBrandProfile(userId: string, dto: UpdateBrandDto): Promise<BrandProfile> {
    let profile = await this.brandRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.brandRepo.create({ userId });
    }
    Object.assign(profile, dto);
    return this.brandRepo.save(profile);
  }

  async updateBrandProfile(userId: string, dto: UpdateBrandDto): Promise<BrandProfile> {
    const profile = await this.getMyBrandProfile(userId);
    Object.assign(profile, dto);
    return this.brandRepo.save(profile);
  }

  async getBrandById(id: string): Promise<BrandProfile> {
    const profile = await this.brandRepo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Brand profile not found');
    return profile;
  }

  // --- Influencer ---

  async createInfluencerProfile(
    userId: string,
    dto: CreateInfluencerDto,
  ): Promise<InfluencerProfile> {
    const existing = await this.influencerRepo.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Influencer profile already exists');
    const profile = this.influencerRepo.create({ ...dto, userId });
    return this.influencerRepo.save(profile);
  }

  async getMyInfluencerProfileOrNull(userId: string): Promise<InfluencerProfile | null> {
    return this.influencerRepo.findOne({ where: { userId } });
  }

  async getMyInfluencerProfile(userId: string): Promise<InfluencerProfile> {
    const profile = await this.influencerRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Influencer profile not found');
    return profile;
  }

  async upsertInfluencerProfile(
    userId: string,
    dto: UpdateInfluencerDto,
  ): Promise<InfluencerProfile> {
    let profile = await this.influencerRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.influencerRepo.create({ userId, displayName: (dto as any).displayName ?? 'New Influencer' });
    }
    Object.assign(profile, dto);
    const saved = await this.influencerRepo.save(profile);
    this.scoringService.calculateScore(saved.id).catch(() => {});
    return saved;
  }

  async updateInfluencerProfile(
    userId: string,
    dto: UpdateInfluencerDto,
  ): Promise<InfluencerProfile> {
    const profile = await this.getMyInfluencerProfile(userId);
    Object.assign(profile, dto);
    const saved = await this.influencerRepo.save(profile);
    this.scoringService.calculateScore(saved.id).catch(() => {});
    return saved;
  }

  async updateAvailabilityStatus(
    userId: string,
    status: AvailabilityStatus,
  ): Promise<InfluencerProfile> {
    const profile = await this.getMyInfluencerProfile(userId);
    profile.availabilityStatus = status;
    return this.influencerRepo.save(profile);
  }

  /** Called after a deal is accepted — auto-sets BUSY if influencer was actively looking */
  async suggestBusyStatus(influencerProfileId: string): Promise<void> {
    const profile = await this.influencerRepo.findOne({ where: { id: influencerProfileId } });
    if (!profile) return;
    if (
      profile.availabilityStatus === AvailabilityStatus.ACTIVELY_LOOKING ||
      profile.availabilityStatus === AvailabilityStatus.CONSIDERING
    ) {
      profile.availabilityStatus = AvailabilityStatus.BUSY;
      await this.influencerRepo.save(profile);
    }
  }

  async getInfluencerById(id: string): Promise<InfluencerProfile> {
    const profile = await this.influencerRepo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Influencer profile not found');
    return profile;
  }

  async updateMyYoutubeStats(userId: string, dto: UpdateYoutubeStatsDto): Promise<InfluencerProfile> {
    const profile = await this.getMyInfluencerProfile(userId);
    return this.updateYoutubeStats(profile.id, dto);
  }

  async updateYoutubeStats(
      influencerId: string,
      stats: {
        youtubeChannelId: string;
        youtubeSubscribers: number;
        youtubeAvgViews: number;
        youtubeMedianViews: number;
        youtubeER: number;
        youtubeVideoCount: number;
        youtubeReachRate: number;
        youtubeStabilityScore: number;
      },
  ): Promise<InfluencerProfile> {
    const profile = await this.influencerRepo.findOne({ where: { id: influencerId } });
    if (!profile) throw new NotFoundException('Influencer profile not found');
    Object.assign(profile, { ...stats, youtubeLastSyncAt: new Date() });
    const saved = await this.influencerRepo.save(profile);
    this.scoringService.calculateScore(saved.id).catch(() => {});
    return saved;
  }
}
