import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfluencerProfile } from '../profiles/entities/influencer-profile.entity';
import { BrandProfile } from '../profiles/entities/brand-profile.entity';

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
  matchedCategories: string[];
  reasons: string[];
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
    @InjectRepository(BrandProfile)
    private brandRepo: Repository<BrandProfile>,
  ) {}

  async getRecommended(brandUserId: string, limit = 20): Promise<MatchResult[]> {
    const brand = await this.brandRepo.findOne({ where: { userId: brandUserId } });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const influencers = await this.influencerRepo.find({
      take: 500,
      order: { createdAt: 'DESC' },
    });

    return influencers
      .map((inf) => this.scoreMatch(brand, inf))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
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

    // ── 1. Category alignment (0–30) ──────────────────────────────────────────
    // Resolve brand industry → affinity list (e.g. "Education" → ["Education","Technology","Science","Business"])
    const affinities = resolveAffinities(brand.industry);

    // Parse influencer categories from simple-array, stripping any empty strings
    // that TypeORM produces when the column value is the empty-string default.
    const influencerCats: string[] = Array.isArray(influencer.categories)
      ? (influencer.categories as string[]).map((c) => c.trim()).filter(Boolean)
      : [];

    // matched = influencer's own categories that appear in the brand affinity list
    const matched = influencerCats.filter((c) =>
      affinities.some((a) => a.toLowerCase() === c.toLowerCase()),
    );
    breakdown.matchedCategories = matched;

    if (affinities.length > 0) {
      // Score = how many of brand's affinities the influencer covers.
      // 3 unique hits → full 30 pts.
      const coverage = matched.length / Math.min(affinities.length, 3);
      breakdown.categoryScore = Math.min(coverage * 30, 30);
    } else {
      breakdown.categoryScore = influencerCats.length > 0 ? 5 : 0;
    }

    // Reason: show the ACTUAL matched categories of the influencer, not the brand's affinity list
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
    const qualityScore =
      influencer.overallScore != null ? Number(influencer.overallScore) : 0;
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
