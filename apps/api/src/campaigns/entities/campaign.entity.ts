import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { BrandProfile } from '../../profiles/entities/brand-profile.entity';
import { Deal } from '../../deals/entities/deal.entity';
import { DealFormat } from '../../deals/entities/deal-format.enum';

export enum CampaignGoal {
  REACH = 'REACH',
  SALES = 'SALES',
  AWARENESS = 'AWARENESS',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  brandId: string;

  @ManyToOne(() => BrandProfile, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brandId' })
  brand: BrandProfile;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CampaignGoal })
  goal: CampaignGoal;

  @Column()
  budget: number;

  @Column({ nullable: true })
  geo: string;

  @Column({ type: 'date' })
  deadline: string;

  @Column({ type: 'enum', enum: DealFormat, enumName: 'campaigns_format_enum' })
  format: DealFormat;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @OneToMany(() => Deal, (d) => d.campaign)
  deals: Deal[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
