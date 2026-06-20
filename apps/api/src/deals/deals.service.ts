import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal, DealStatus } from './entities/deal.entity';
import { CreateDealDto } from './dto/create-deal.dto';
import { CounterDealDto } from './dto/counter-deal.dto';
import { User, UserRole } from '../common/entities/user.entity';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private dealsRepo: Repository<Deal>,
    private profilesService: ProfilesService,
  ) {}

  async createDeal(user: User, dto: CreateDealDto): Promise<Deal> {
    const brandProfile = await this.profilesService.getMyBrandProfile(user.id);
    const deal = this.dealsRepo.create({
      brandId: brandProfile.id,
      influencerId: dto.influencerId,
      ...(dto.campaignId && { campaignId: dto.campaignId }),
      budget: dto.budget,
      format: dto.format,
      description: dto.description,
      deadline: dto.deadline,
      status: DealStatus.PENDING,
    });
    return this.dealsRepo.save(deal);
  }

  async listDeals(user: User): Promise<Deal[]> {
    if (user.role === UserRole.BRAND) {
      const brand = await this.profilesService.getMyBrandProfile(user.id);
      return this.dealsRepo.find({ where: { brandId: brand.id } });
    } else {
      const influencer = await this.profilesService.getMyInfluencerProfile(user.id);
      return this.dealsRepo.find({ where: { influencerId: influencer.id } });
    }
  }

  async getDeal(id: string, user: User): Promise<Deal> {
    const deal = await this.dealsRepo.findOne({ where: { id } });
    if (!deal) throw new NotFoundException('Deal not found');
    await this.assertParticipant(deal, user);
    return deal;
  }

  async acceptDeal(id: string, user: User): Promise<Deal> {
    const deal = await this.getDeal(id, user);
    if (user.role === UserRole.BRAND) {
      this.assertStatus(deal, [DealStatus.COUNTERED]);
    } else {
      this.assertStatus(deal, [DealStatus.PENDING, DealStatus.COUNTERED]);
    }
    if (deal.status === DealStatus.COUNTERED && deal.counterBudget) {
      deal.budget = deal.counterBudget;
    }
    deal.status = DealStatus.ACCEPTED;
    return this.dealsRepo.save(deal);
  }

  async rejectDeal(id: string, user: User): Promise<Deal> {
    const deal = await this.getDeal(id, user);
    if (user.role === UserRole.BRAND) {
      this.assertStatus(deal, [DealStatus.COUNTERED]);
    } else {
      this.assertStatus(deal, [DealStatus.PENDING, DealStatus.COUNTERED]);
    }
    deal.status = DealStatus.REJECTED;
    return this.dealsRepo.save(deal);
  }

  async counterDeal(id: string, user: User, dto: CounterDealDto): Promise<Deal> {
    const deal = await this.getDeal(id, user);
    if (user.role === UserRole.BRAND) {
      this.assertStatus(deal, [DealStatus.COUNTERED]);
    } else {
      this.assertStatus(deal, [DealStatus.PENDING]);
    }
    deal.status = DealStatus.COUNTERED;
    deal.counterBudget = dto.counterBudget;
    deal.counterNote = dto.counterNote ?? '';
    return this.dealsRepo.save(deal);
  }

  async completeDeal(id: string, user: User): Promise<Deal> {
    const deal = await this.getDeal(id, user);
    this.assertBrand(user);
    this.assertStatus(deal, [DealStatus.ACTIVE, DealStatus.ACCEPTED]);
    deal.status = DealStatus.COMPLETED;
    return this.dealsRepo.save(deal);
  }

  async cancelDeal(id: string, user: User): Promise<Deal> {
    const deal = await this.getDeal(id, user);
    this.assertStatus(deal, [
      DealStatus.PENDING,
      DealStatus.COUNTERED,
      DealStatus.ACTIVE,
      DealStatus.ACCEPTED,
    ]);
    deal.status = DealStatus.CANCELLED;
    return this.dealsRepo.save(deal);
  }

  private async assertParticipant(deal: Deal, user: User): Promise<void> {
    if (user.role === UserRole.BRAND) {
      const brand = await this.profilesService.getMyBrandProfile(user.id);
      if (deal.brandId !== brand.id) throw new ForbiddenException();
    } else if (user.role === UserRole.INFLUENCER) {
      const influencer = await this.profilesService.getMyInfluencerProfile(user.id);
      if (deal.influencerId !== influencer.id) throw new ForbiddenException();
    }
  }

  private assertInfluencer(user: User): void {
    if (user.role !== UserRole.INFLUENCER) throw new ForbiddenException('Only influencers can perform this action');
  }

  private assertBrand(user: User): void {
    if (user.role !== UserRole.BRAND) throw new ForbiddenException('Only brands can perform this action');
  }

  private assertStatus(deal: Deal, allowed: DealStatus[]): void {
    if (!allowed.includes(deal.status))
      throw new BadRequestException(`Deal status must be one of: ${allowed.join(', ')}`);
  }
}
