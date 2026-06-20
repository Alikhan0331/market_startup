import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BrandProfile } from '../../profiles/entities/brand-profile.entity';
import { InfluencerProfile } from '../../profiles/entities/influencer-profile.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { DealFormat } from './deal-format.enum';

export { DealFormat };

export enum DealStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COUNTERED = 'COUNTERED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  brandId: string;

  @ManyToOne(() => BrandProfile, { eager: true })
  @JoinColumn({ name: 'brandId' })
  brand: BrandProfile;

  @Column()
  influencerId: string;

  @ManyToOne(() => InfluencerProfile, { eager: true })
  @JoinColumn({ name: 'influencerId' })
  influencer: InfluencerProfile;

  @Column({ type: 'enum', enum: DealStatus, default: DealStatus.PENDING })
  status: DealStatus;

  @Column()
  budget: number;

  @Column({ type: 'enum', enum: DealFormat })
  format: DealFormat;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date' })
  deadline: string;

  @Column({ nullable: true })
  campaignId: string;

  @ManyToOne(() => Campaign, (c) => c.deals, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column({ nullable: true })
  counterBudget: number;

  @Column({ type: 'text', nullable: true })
  counterNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
