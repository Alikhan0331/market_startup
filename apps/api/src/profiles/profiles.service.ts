import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandProfile } from './entities/brand-profile.entity';
import { InfluencerProfile } from './entities/influencer-profile.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
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

  async getMyBrandProfile(userId: string): Promise<BrandProfile> {
    const profile = await this.brandRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Brand profile not found');
    return profile;
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

  async getMyInfluencerProfile(userId: string): Promise<InfluencerProfile> {
    const profile = await this.influencerRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Influencer profile not found');
    return profile;
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

  async getInfluencerById(id: string): Promise<InfluencerProfile> {
    const profile = await this.influencerRepo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Influencer profile not found');
    return profile;
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

    Object.assign(profile, {
      ...stats,
      youtubeLastSyncAt: new Date(),
    });

    const saved = await this.influencerRepo.save(profile);

    // Пересчитываем общий скор после обновления статистики
    this.scoringService.calculateScore(saved.id).catch(() => {});

    return saved;
  }
}
