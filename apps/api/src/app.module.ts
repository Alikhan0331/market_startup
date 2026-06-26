import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SearchModule } from './search/search.module';
import { DealsModule } from './deals/deals.module';
import { ScoringModule } from './scoring/scoring.module';
import { YoutubeModule } from './youtube/youtube.module';
import { MatchingModule } from './matching/matching.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ReliabilityModule } from './reliability/reliability.module';
import { PricingModule } from './pricing/pricing.module';
import { InstagramModule } from './instagram/instagram.module';
import { PartnershipModule } from './partnership/partnership.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TiktokModule } from './tiktok/tiktok.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'influencer_marketplace'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ProfilesModule,
    SearchModule,
    DealsModule,
    YoutubeModule,
    TiktokModule,
    ScoringModule,
    MatchingModule,
    InstagramModule,
    CampaignsModule,
    ReliabilityModule,
    PricingModule,
    PartnershipModule,
    SchedulerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
