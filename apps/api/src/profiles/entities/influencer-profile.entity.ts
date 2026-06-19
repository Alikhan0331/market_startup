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

  @Column()
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

  // Instagram
  @Column({ nullable: true })
  instagramHandle: string;

  @Column({ default: 0 })
  instagramFollowers: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  instagramER: number;

  @Column({ default: 0 })
  instagramAvgReach: number;

  // TikTok
  @Column({ nullable: true })
  tiktokHandle: string;

  @Column({ default: 0 })
  tiktokFollowers: number;

  @Column({ default: 0 })
  tiktokAvgViews: number;

  // YouTube
  @Column({ nullable: true })
  youtubeHandle: string;

  @Column({ default: 0 })
  youtubeSubscribers: number;

  @Column({ default: 0 })
  youtubeAvgViews: number;

  @Column({ nullable: true })
  youtubeChannelId: string;           // UC... id канала (нужен для API запросов)

  @Column({ default: 0 })
  youtubeMedianViews: number;         // медиана просмотров (надёжнее среднего)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  youtubeER: number;                  // (likes + comments) / views * 100

  @Column({ default: 0 })
  youtubeVideoCount: number;          // количество проанализированных видео

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  youtubeReachRate: number;           // medianViews / subscribers * 100

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  youtubeStabilityScore: number;      // 0-10: насколько стабильны просмотры

  @Column({ type: 'timestamp', nullable: true })
  youtubeLastSyncAt: Date;            // когда последний раз синхронизировали с API

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
