import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfluencerProfile, AvailabilityStatus } from '../profiles/entities/influencer-profile.entity';
import { SearchInfluencersDto, Platform, SortBy } from './dto/search-influencers.dto';

const EXCLUDED_STATUSES: AvailabilityStatus[] = [
  AvailabilityStatus.BUSY,
  AvailabilityStatus.NOT_LOOKING,
];

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(InfluencerProfile)
    private influencerRepo: Repository<InfluencerProfile>,
  ) {}

  async searchInfluencers(dto: SearchInfluencersDto) {
    const {
      country,
      city,
      category,
      minFollowers,
      maxFollowers,
      minPrice,
      maxPrice,
      minER,
      platform,
      sortBy = SortBy.SCORE,
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = dto;

    const qb = this.influencerRepo
      .createQueryBuilder('ip')
      .leftJoinAndSelect('ip.user', 'user')
      // Exclude influencers who are not available
      .where('ip.availabilityStatus NOT IN (:...excluded)', { excluded: EXCLUDED_STATUSES });

    if (country) qb.andWhere('ip.country = :country', { country });
    if (city) qb.andWhere('ip.city ILIKE :city', { city: `%${city}%` });
    if (category)
      qb.andWhere('ip.categories LIKE :category', { category: `%${category}%` });

    if (platform === Platform.INSTAGRAM) {
      if (minFollowers !== undefined)
        qb.andWhere('ip.instagramFollowers >= :minFollowers', { minFollowers });
      if (maxFollowers !== undefined)
        qb.andWhere('ip.instagramFollowers <= :maxFollowers', { maxFollowers });
      if (minER !== undefined)
        qb.andWhere('ip.instagramER >= :minER', { minER });
    } else if (platform === Platform.TIKTOK) {
      if (minFollowers !== undefined)
        qb.andWhere('ip.tiktokFollowers >= :minFollowers', { minFollowers });
      if (maxFollowers !== undefined)
        qb.andWhere('ip.tiktokFollowers <= :maxFollowers', { maxFollowers });
    } else if (platform === Platform.YOUTUBE) {
      if (minFollowers !== undefined)
        qb.andWhere('ip.youtubeSubscribers >= :minFollowers', { minFollowers });
      if (maxFollowers !== undefined)
        qb.andWhere('ip.youtubeSubscribers <= :maxFollowers', { maxFollowers });
    } else {
      if (minFollowers !== undefined)
        qb.andWhere(
          `GREATEST(ip.instagramFollowers, ip.tiktokFollowers, ip.youtubeSubscribers) >= :minFollowers`,
          { minFollowers },
        );
      if (maxFollowers !== undefined)
        qb.andWhere(
          `GREATEST(ip.instagramFollowers, ip.tiktokFollowers, ip.youtubeSubscribers) <= :maxFollowers`,
          { maxFollowers },
        );
    }

    if (minPrice !== undefined) qb.andWhere('ip.priceFrom >= :minPrice', { minPrice });
    if (maxPrice !== undefined) qb.andWhere('ip.priceTo <= :maxPrice', { maxPrice });

    const order = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    switch (sortBy) {
      case SortBy.SCORE:
        qb.orderBy('ip.overallScore', order, 'NULLS LAST');
        break;
      case SortBy.FOLLOWERS:
        qb.orderBy(
          `GREATEST(ip.instagramFollowers, ip.tiktokFollowers, ip.youtubeSubscribers)`,
          order,
        );
        break;
      case SortBy.PRICE:
        qb.orderBy('ip.priceFrom', order, 'NULLS LAST');
        break;
      case SortBy.ER:
        qb.orderBy('ip.instagramER', order, 'NULLS LAST');
        break;
    }

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
