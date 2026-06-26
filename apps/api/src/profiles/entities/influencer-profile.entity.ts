import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  WARNING = 'WARNING',
  SUSPICIOUS = 'SUSPICIOUS',
}

export enum AvailabilityStatus {
  ACTIVELY_LOOKING = 'ACTIVELY_LOOKING',
  CONSIDERING = 'CONSIDERING',
  NOT_LOOKING = 'NOT_LOOKING',
  BUSY = 'BUSY',
}

@Entity('influencer_profiles')
export class InfluencerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  displayName: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column('simple-array', { default: '' })
  categories: string[];

  @Column('simple-array', { nullable: true })
  languages: string[];

  @Column({ nullable: true })
  priceFrom: number;

  @Column({ nullable: true })
  priceTo: number;

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.ACTIVELY_LOOKING,
  })
  availabilityStatus: AvailabilityStatus;

  // Instagram
  @Column({ nullable: true })
  instagramHandle: string;

  @Column({ default: 0 })
  instagramFollowers: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  instagramER: number;

  @Column({ default: 0 })
  instagramAvgReach: number;
  // Instagram OAuth
  @Column({ nullable: true, select: false }) // select:false — не возвращается в API
  instagramAccessToken: string;

  @Column({ nullable: true })
  instagramUserId: string;

  @Column({ type: 'timestamp', nullable: true })
  instagramLastSyncAt: Date;

  // TikTok
  @Column({ nullable: true })
  tiktokHandle: string;

  @Column({ default: 0 })
  tiktokFollowers: number;

  @Column({ default: 0 })
  tiktokAvgViews: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tiktokER: number;

  @Column({ nullable: true, select: false })
  tiktokAccessToken: string;

  @Column({ nullable: true })
  tiktokUserId: string;

  @Column({ type: 'timestamp', nullable: true })
  tiktokLastSyncAt: Date;

  // YouTube
  @Column({ nullable: true })
  youtubeHandle: string;

  @Column({ default: 0 })
  youtubeSubscribers: number;

  @Column({ default: 0 })
  youtubeAvgViews: number;

  @Column({ nullable: true })
  youtubeChannelId: string;

  @Column({ default: 0 })
  youtubeMedianViews: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  youtubeER: number;

  @Column({ default: 0 })
  youtubeVideoCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  youtubeReachRate: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  youtubeStabilityScore: number;

  @Column({ type: 'timestamp', nullable: true })
  youtubeLastSyncAt: Date;

  // AI Scores
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  reachScore: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  engagementScore: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  audienceScore: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  overallScore: number;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verificationStatus: VerificationStatus;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  reliabilityScore: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
