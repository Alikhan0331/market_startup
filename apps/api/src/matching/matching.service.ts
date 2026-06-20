import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfluencerProfile } from '../profiles/entities/influencer-profile.entity';
import { BrandProfile } from '../profiles/entities/brand-profile.entity';

// Industry → content category affinity map
// Keys are lowercase for case-insensitive matching.
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

/** Resolve a potentially comma-separated industry string into a merged, de-duped affinity list */
function resolveAffinities(industry: string | null | undefined): string[] {
  if (!industry) return [];
  const segments = industry.split(',').map((s) => s.trim()).filter(Boolean);
  const all: string[] = [];
  for (const seg of segments) {
    const key = seg.toLowerCase();
    const cats = INDUSTRY_CATEGORY_MAP[key];
    if (cats) all.push(...cats);
  }
  // De-duplicate
  return [...new Set(all)];
}

export interface MatchResult {
  influencer: InfluencerProfile;
  matchScore: number;           // 0-100
  breakdown: MatchBreakdown;
}

export interface MatchBreakdown {
  categoryScore: number;        // 0-30  — how well categories align with brand industry
  countryScore: number;         // 0-20  — same country bonus
  engagementScore: number;      // 0-25  — overall influencer quality score
  budgetScore: number;          // 0-15  — price compatibility
  verificationScore: number;    // 0-10  — verified status bonus
  matchedCategories: string[];  // human-readable list of matched categories
  reasons: string[];            // human-readable match reasons
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
    @InjectRepository(BrandProfile)
    private brandRepo: Repository<BrandProfile>,
  ) {}

  async getRecommended(
    brandUserId: string,
    limit = 20,
  ): Promise<MatchResult[]> {
    const brand = await this.brandRepo.findOne({ where: { userId: brandUserId } });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const influencers = await this.influencerRepo.find({
      take: 500,
      order: { createdAt: 'DESC' },
    });

    const results: MatchResult[] = influencers
      .map((inf) => this.scoreMatch(brand, inf))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return results;
  }

  private scoreMatch(brand: BrandProfile, influencer: InfluencerProfile): MatchResult {
    const breakdown: MatchBreakdown = {
      categoryScore: 0,
      countryScore: 0,
      engagementScore: 0,
      budgetScore: 0,
      verificationScore: 0,
      matchedCategories: [],
      reasons: [],
    };

    // 1. Category alignment (0-30)
    // brand.industry may be multi-value e.g. "Fashion, Tech"
    const affinities = resolveAffinities(brand.industry);
    const influencerCats: string[] = Array.isArray(influencer.categories)
      ? (influencer.categories as string[]).filter(Boolean)
      : [];

    const matched = influencerCats.filter(
      (c) => affinities.some((a) => a.toLowerCase() === c.toLowerCase()),
    );
    breakdown.matchedCategories = matched;

    if (affinities.length > 0 && influencerCats.length > 0) {
      // score proportional to fraction of influencer's categories that hit the brand's affinity list
      const hitRatio = matched.length / influencerCats.length;
      breakdown.categoryScore = Math.min(hitRatio * 30, 30);
    } else if (influencerCats.length > 0 && affinities.length === 0) {
      // Brand has no recognised industry but influencer has categories — give a partial base
      breakdown.categoryScore = 5;
    }

    if (matched.length > 0) {
      const industryLabel = brand.industry ?? 'your industry';
      breakdown.reasons.push(
        `Content matches ${industryLabel} (${matched.slice(0, 3).join(', ')})`,
      );
    }

    // 2. Country match (0-20)
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

    // 3. Quality score (0-25)
    const qualityScore = influencer.overallScore != null ? Number(influencer.overallScore) : 0;
    breakdown.engagementScore = (qualityScore / 10) * 25;
    if (qualityScore >= 7) {
      breakdown.reasons.push(`High quality score (${qualityScore.toFixed(1)}/10)`);
    } else if (influencer.overallScore == null) {
      breakdown.reasons.push('Score pending — not yet calculated');
    }

    // 4. Budget compatibility (0-15)
    if (influencer.priceFrom != null && influencer.priceTo != null) {
      breakdown.budgetScore = 15;
      breakdown.reasons.push('Has defined pricing');
    } else if (influencer.priceFrom != null) {
      breakdown.budgetScore = 8;
      breakdown.reasons.push('Has starting price listed');
    }

    // 5. Verification bonus (0-10)
    switch (influencer.verificationStatus) {
      case 'VERIFIED':
        breakdown.verificationScore = 10;
        breakdown.reasons.push('Verified account');
        break;
      case 'UNVERIFIED':
        breakdown.verificationScore = 4;
        breakdown.reasons.push('Profile not yet verified');
        break;
      case 'WARNING':
        breakdown.verificationScore = 1;
        break;
      default:
        breakdown.verificationScore = 0;
    }

    const matchScore = Math.round(
      breakdown.categoryScore +
      breakdown.countryScore +
      breakdown.engagementScore +
      breakdown.budgetScore +
      breakdown.verificationScore,
    );

    return { influencer, matchScore, breakdown };
  }
}
