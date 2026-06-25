import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfluencerProfile, AvailabilityStatus } from '../profiles/entities/influencer-profile.entity';
import { BrandProfile } from '../profiles/entities/brand-profile.entity';
import { PartnershipService } from '../partnership/partnership.service';
import { PartnershipTier } from '../partnership/entities/partnership-score.entity';

const INDUSTRY_CATEGORY_MAP: Record<string, string[]> = {
  fashion:       ['Fashion', 'Lifestyle', 'Beauty', 'Travel'],
  beauty:        ['Beauty', 'Fashion', 'Lifestyle', 'Health'],
  technology:    ['Technology', 'Gaming', 'Science', 'Education'],
  tech:          ['Technology', 'Gaming', 'Science', 'Education'],
  it:            ['Technology', 'Gaming', 'Science', 'Education'],
  software:      ['Technology', 'Gaming', 'Science', 'Education'],
  food:          ['Food', 'Lifestyle', 'Travel', 'Health'],
  travel:        ['Travel', 'Lifestyle', 'Photography', 'Adventure'],
  fitness:       ['Fitness', 'Health', 'Lifestyle', 'Sports'],
  gaming:        ['Gaming', 'Technology', 'Entertainment', 'Esports'],
  finance:       ['Finance', 'Business', 'Education', 'Technology'],
  health:        ['Health', 'Fitness', 'Lifestyle', 'Wellness'],
  wellness:      ['Health', 'Fitness', 'Lifestyle', 'Wellness'],
  entertainment: ['Entertainment', 'Music', 'Movies', 'Lifestyle'],
  education:     ['Education', 'Technology', 'Science', 'Business'],
  sports:        ['Sports', 'Fitness', 'Health', 'Lifestyle'],
  automotive:    ['Automotive', 'Technology', 'Travel', 'Lifestyle'],
  retail:        ['Lifestyle', 'Fashion', 'Shopping', 'Home'],
  music:         ['Music', 'Entertainment', 'Lifestyle', 'Art'],
  art:           ['Art', 'Lifestyle', 'Photography', 'Entertainment'],
  photography:   ['Photography', 'Art', 'Lifestyle', 'Travel'],
  business:      ['Business', 'Finance', 'Education', 'Technology'],
  marketing:     ['Business', 'Lifestyle', 'Technology', 'Education'],
  ecommerce:     ['Lifestyle', 'Fashion', 'Shopping', 'Technology'],
};

function resolveAffinities(industry: string | null | undefined): string[] {
  if (!industry) return [];
  const segments = industry.split(',').map((s) => s.trim()).filter(Boolean);
  const all: string[] = [];
  for (const seg of segments) {
    const cats = INDUSTRY_CATEGORY_MAP[seg.toLowerCase()];
    if (cats) all.push(...cats);
  }
  return [...new Set(all)];
}

export interface MatchResult {
  influencer: InfluencerProfile;
  matchScore: number;
  breakdown: MatchBreakdown;
}

export interface MatchBreakdown {
  categoryScore: number;
  countryScore: number;
  engagementScore: number;
  budgetScore: number;
  verificationScore: number;
  partnershipBonus: number;
  reliabilityBonus: number;
  matchedCategories: string[];
  reasons: string[];
}

const EXCLUDED_STATUSES: AvailabilityStatus[] = [
  AvailabilityStatus.BUSY,
  AvailabilityStatus.NOT_LOOKING,
];

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
    @InjectRepository(BrandProfile)
    private brandRepo: Repository<BrandProfile>,
    private partnershipService: PartnershipService,
  ) {}

  async getRecommended(brandUserId: string, limit = 20): Promise<MatchResult[]> {
    const brand = await this.brandRepo.findOne({ where: { userId: brandUserId } });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const influencers = await this.influencerRepo
      .createQueryBuilder('ip')
      .where('ip.availabilityStatus NOT IN (:...excluded)', { excluded: EXCLUDED_STATUSES })
      .orderBy('ip.createdAt', 'DESC')
      .take(500)
      .getMany();

    // Load all partnerships for this brand in one query for efficient lookup
    const partnerships = await this.partnershipService.getAllPartnershipsForBrand(brand.id);

    return influencers
      .map((inf) => this.scoreMatch(brand, inf, partnerships))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  private scoreMatch(
    brand: BrandProfile,
    influencer: InfluencerProfile,
    partnerships: Map<string, PartnershipTier> = new Map(),
  ): MatchResult {
    const breakdown: MatchBreakdown = {
      categoryScore: 0,
      countryScore: 0,
      engagementScore: 0,
      budgetScore: 0,
      verificationScore: 0,
      partnershipBonus: 0,
      reliabilityBonus: 0,
      matchedCategories: [],
      reasons: [],
    };

    // ── 1. Category alignment (0–30) ──────────────────────────────────────────
    const affinities = resolveAffinities(brand.industry);

    const influencerCats: string[] = Array.isArray(influencer.categories)
      ? (influencer.categories as string[]).map((c) => c.trim()).filter(Boolean)
      : [];

    const matched = influencerCats.filter((c) =>
      affinities.some((a) => a.toLowerCase() === c.toLowerCase()),
    );
    breakdown.matchedCategories = matched;

    if (affinities.length > 0) {
      const coverage = matched.length / Math.min(affinities.length, 3);
      breakdown.categoryScore = Math.min(coverage * 30, 30);
    } else {
      breakdown.categoryScore = influencerCats.length > 0 ? 5 : 0;
    }

    if (matched.length > 0) {
      breakdown.reasons.push(
        `Content matches ${brand.industry ?? 'your industry'} (${matched.slice(0, 3).join(', ')})`,
      );
    }

    // ── 2. Country match (0–20) ───────────────────────────────────────────────
    const brandCountry = (brand.country ?? '').toLowerCase().trim();
    const infCountry = (influencer.country ?? '').toLowerCase().trim();
    if (brandCountry && infCountry) {
      if (brandCountry === infCountry) {
        breakdown.countryScore = 20;
        breakdown.reasons.push(`Same country (${brand.country})`);
      } else if (brandCountry.slice(0, 2) === infCountry.slice(0, 2)) {
        breakdown.countryScore = 8;
        breakdown.reasons.push('Similar region');
      }
    }

    // ── 3. Quality score (0–25) ───────────────────────────────────────────────
    // If AI score absent, derive from best available ER (Instagram preferred, YouTube fallback)
    const igER = Number(influencer.instagramER ?? 0);
    const ytER = Number(influencer.youtubeER ?? 0);
    const platformER = (igER > 0 && ytER > 0) ? igER * 0.6 + ytER * 0.4
                     : igER > 0 ? igER : ytER;
    const erScore =
      platformER >= 6 ? 9 : platformER >= 4 ? 7.5 : platformER >= 2 ? 6 : platformER >= 1 ? 4.5 : 0;
    const qualityScore =
      influencer.overallScore != null ? Number(influencer.overallScore) : erScore;
    breakdown.engagementScore = (qualityScore / 10) * 25;
    if (qualityScore >= 7) {
      breakdown.reasons.push(`High quality score (${qualityScore.toFixed(1)}/10)`);
    }

    // ── 4. Budget compatibility (0–15) ────────────────────────────────────────
    if (influencer.priceFrom != null && influencer.priceTo != null) {
      breakdown.budgetScore = 15;
      breakdown.reasons.push('Has defined pricing');
    } else if (influencer.priceFrom != null) {
      breakdown.budgetScore = 8;
      breakdown.reasons.push('Has starting price listed');
    }

    // ── 5. Verification bonus (0–10) ──────────────────────────────────────────
    switch (influencer.verificationStatus) {
      case 'VERIFIED':
        breakdown.verificationScore = 10;
        breakdown.reasons.push('Verified account');
        break;
      case 'UNVERIFIED':
        breakdown.verificationScore = 4;
        break;
      case 'WARNING':
        breakdown.verificationScore = 1;
        break;
      default:
        breakdown.verificationScore = 0;
    }

    // ── 6. Partnership bonus (0–10) ──────────────────────────────────────────
    const tier = partnerships.get(influencer.id) ?? PartnershipTier.NONE;
    switch (tier) {
      case PartnershipTier.EXCLUSIVE:
        breakdown.partnershipBonus = 10;
        breakdown.reasons.push('Exclusive Partner — proven collaboration history');
        break;
      case PartnershipTier.TRUSTED:
        breakdown.partnershipBonus = 7;
        breakdown.reasons.push('Trusted Partner — multiple successful deals');
        break;
      case PartnershipTier.RETURNING:
        breakdown.partnershipBonus = 4;
        breakdown.reasons.push('Returning Partner — worked together before');
        break;
    }

    // ── 7. Reliability bonus (-5 to +8) ─────────────────────────────────────
    const reliability = influencer.reliabilityScore !== null
      ? Number(influencer.reliabilityScore)
      : null;
    if (reliability !== null) {
      if (reliability >= 80) {
        breakdown.reliabilityBonus = 8;
        breakdown.reasons.push(`Highly reliable (${Math.round(reliability)}% score)`);
      } else if (reliability >= 60) {
        breakdown.reliabilityBonus = 4;
      } else if (reliability < 40) {
        breakdown.reliabilityBonus = -5;
        breakdown.reasons.push(`Low reliability score (${Math.round(reliability)}%)`);
      }
    }

    const matchScore = Math.round(
      breakdown.categoryScore +
      breakdown.countryScore +
      breakdown.engagementScore +
      breakdown.budgetScore +
      breakdown.verificationScore +
      breakdown.partnershipBonus +
      breakdown.reliabilityBonus,
    );

    return { influencer, matchScore, breakdown };
  }
}
