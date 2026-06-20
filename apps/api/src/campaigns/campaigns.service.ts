import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { InfluencerProfile } from '../profiles/entities/influencer-profile.entity';
import { DealFormat } from '../deals/entities/deal.entity';

const PLATFORM_FORMAT_MAP: Record<DealFormat, ('instagramFollowers' | 'tiktokFollowers' | 'youtubeSubscribers')[]> = {
  [DealFormat.STORY]:       ['instagramFollowers'],
  [DealFormat.REEL]:        ['instagramFollowers', 'tiktokFollowers'],
  [DealFormat.POST]:        ['instagramFollowers'],
  [DealFormat.VIDEO]:       ['youtubeSubscribers', 'tiktokFollowers'],
  [DealFormat.INTEGRATION]: ['youtubeSubscribers'],
};

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
    private profilesService: ProfilesService,
  ) {}

  async create(userId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const brand = await this.profilesService.getMyBrandProfile(userId);
    const campaign = this.campaignRepo.create({ ...dto, brandId: brand.id });
    return this.campaignRepo.save(campaign);
  }

  async findMine(userId: string): Promise<Campaign[]> {
    const brand = await this.profilesService.getMyBrandProfile(userId);
    return this.campaignRepo.find({
      where: { brandId: brand.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id }, relations: { deals: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    await this.assertOwner(campaign, userId);
    return campaign;
  }

  async findPublic(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      where: { isPublic: true, status: CampaignStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, userId: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id, userId);
    if (campaign.status === CampaignStatus.COMPLETED || campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Cannot edit a completed or cancelled campaign');
    }
    Object.assign(campaign, dto);
    return this.campaignRepo.save(campaign);
  }

  async remove(id: string, userId: string): Promise<void> {
    const campaign = await this.findOne(id, userId);
    await this.campaignRepo.remove(campaign);
  }

  async getMatches(id: string, userId: string, limit = 20) {
    const campaign = await this.findOne(id, userId);

    const influencers = await this.influencerRepo.find({ take: 500, order: { overallScore: 'DESC' } });

    return influencers
      .map((inf) => this.scoreForCampaign(campaign, inf))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  private scoreForCampaign(campaign: Campaign, influencer: InfluencerProfile) {
    const breakdown = {
      nicheScore: 0,
      geoScore: 0,
      budgetScore: 0,
      formatScore: 0,
      qualityScore: 0,
      reasons: [] as string[],
    };

    // ── 1. Niche (0–30): brand industry → affinity → influencer categories ──
    const brandIndustry = (campaign.brand?.industry ?? '').toLowerCase();
    const influencerCats: string[] = Array.isArray(influencer.categories)
      ? (influencer.categories as string[]).map((c) => c.trim()).filter(Boolean)
      : [];

    const AFFINITY_MAP: Record<string, string[]> = {
      fashion: ['Fashion', 'Lifestyle', 'Beauty', 'Travel'],
      beauty: ['Beauty', 'Fashion', 'Lifestyle', 'Health'],
      technology: ['Technology', 'Gaming', 'Science', 'Education'],
      tech: ['Technology', 'Gaming', 'Science', 'Education'],
      food: ['Food', 'Lifestyle', 'Travel', 'Health'],
      travel: ['Travel', 'Lifestyle', 'Photography'],
      fitness: ['Fitness', 'Health', 'Lifestyle', 'Sports'],
      gaming: ['Gaming', 'Technology', 'Entertainment'],
      finance: ['Finance', 'Business', 'Education'],
      health: ['Health', 'Fitness', 'Lifestyle', 'Wellness'],
      entertainment: ['Entertainment', 'Music', 'Lifestyle'],
      education: ['Education', 'Technology', 'Science'],
      sports: ['Sports', 'Fitness', 'Health'],
    };

    const affinities: string[] = [];
    for (const seg of brandIndustry.split(',').map((s) => s.trim())) {
      const cats = AFFINITY_MAP[seg];
      if (cats) affinities.push(...cats);
    }

    const matched = influencerCats.filter((c) =>
      affinities.some((a) => a.toLowerCase() === c.toLowerCase()),
    );
    if (affinities.length > 0) {
      breakdown.nicheScore = Math.min((matched.length / Math.min(affinities.length, 3)) * 30, 30);
    }
    if (matched.length > 0) {
      breakdown.reasons.push(`Matches niche (${matched.slice(0, 2).join(', ')})`);
    }

    // ── 2. Geo (0–20): campaign.geo vs influencer.country ────────────────
    const campGeo = (campaign.geo ?? '').toLowerCase().trim();
    const infCountry = (influencer.country ?? '').toLowerCase().trim();
    if (campGeo && infCountry) {
      if (campGeo === infCountry) {
        breakdown.geoScore = 20;
        breakdown.reasons.push(`Same country (${influencer.country})`);
      } else if (campGeo.slice(0, 2) === infCountry.slice(0, 2)) {
        breakdown.geoScore = 8;
        breakdown.reasons.push('Similar region');
      }
    }

    // ── 3. Budget fit (0–25): campaign.budget vs influencer priceFrom ────
    const priceFrom = influencer.priceFrom != null ? Number(influencer.priceFrom) : null;
    const priceTo = influencer.priceTo != null ? Number(influencer.priceTo) : null;

    if (priceFrom != null && priceTo != null) {
      if (priceFrom <= campaign.budget && campaign.budget <= priceTo) {
        breakdown.budgetScore = 25;
        breakdown.reasons.push('Budget matches pricing range');
      } else if (priceFrom <= campaign.budget) {
        breakdown.budgetScore = 15;
        breakdown.reasons.push('Budget covers starting price');
      } else if (priceFrom <= campaign.budget * 1.3) {
        breakdown.budgetScore = 8;
        breakdown.reasons.push('Price slightly above budget');
      }
    } else if (priceFrom != null && priceFrom <= campaign.budget) {
      breakdown.budgetScore = 15;
      breakdown.reasons.push('Budget covers starting price');
    }

    // ── 4. Format / platform fit (0–15) ──────────────────────────────────
    const relevantFields = PLATFORM_FORMAT_MAP[campaign.format] ?? [];
    const hasRelevantPlatform = relevantFields.some(
      (field) => (influencer[field] ?? 0) > 0,
    );
    if (hasRelevantPlatform) {
      breakdown.formatScore = 15;
      breakdown.reasons.push(`Active on required platform (${campaign.format})`);
    }

    // ── 5. Quality bonus (0–10) ───────────────────────────────────────────
    const overall = influencer.overallScore != null ? Number(influencer.overallScore) : 0;
    breakdown.qualityScore = (overall / 10) * 10;
    if (overall >= 7) breakdown.reasons.push(`High quality score (${overall.toFixed(1)}/10)`);

    const matchScore = Math.round(
      breakdown.nicheScore + breakdown.geoScore + breakdown.budgetScore +
      breakdown.formatScore + breakdown.qualityScore,
    );

    return { influencer, matchScore, breakdown };
  }

  private async assertOwner(campaign: Campaign, userId: string): Promise<void> {
    const brand = await this.profilesService.getMyBrandProfile(userId);
    if (campaign.brandId !== brand.id) throw new ForbiddenException();
  }
}
