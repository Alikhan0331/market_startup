import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { UpdateYoutubeStatsDto } from './dto/update-youtube-stats.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../common/entities/user.entity';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // --- Brand endpoints ---

  @Post('brands/profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  @ApiOperation({ summary: 'Create brand profile' })
  @ApiResponse({ status: 201 })
  createBrand(@CurrentUser() user: User, @Body() dto: CreateBrandDto) {
    return this.profilesService.createBrandProfile(user.id, dto);
  }

  @Get('brands/me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  @ApiOperation({ summary: 'Get own brand profile' })
  getMyBrand(@CurrentUser() user: User) {
    return this.profilesService.getMyBrandProfileOrNull(user.id);
  }

  @Put('brands/me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  @ApiOperation({ summary: 'Upsert own brand profile' })
  updateMyBrand(@CurrentUser() user: User, @Body() dto: UpdateBrandDto) {
    return this.profilesService.upsertBrandProfile(user.id, dto);
  }

  @Get('brands/:id')
  @ApiOperation({ summary: 'Get brand profile by id (public)' })
  getBrandById(@Param('id') id: string) {
    return this.profilesService.getBrandById(id);
  }

  // --- Influencer endpoints ---

  @Post('influencers/profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Create influencer profile' })
  @ApiResponse({ status: 201 })
  createInfluencer(@CurrentUser() user: User, @Body() dto: CreateInfluencerDto) {
    return this.profilesService.createInfluencerProfile(user.id, dto);
  }

  @Get('influencers/me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Get own influencer profile' })
  getMyInfluencer(@CurrentUser() user: User) {
    return this.profilesService.getMyInfluencerProfileOrNull(user.id);
  }

  @Put('influencers/me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Upsert own influencer profile' })
  updateMyInfluencer(@CurrentUser() user: User, @Body() dto: UpdateInfluencerDto) {
    return this.profilesService.upsertInfluencerProfile(user.id, dto);
  }

  @Patch('influencers/me/youtube')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Save YouTube channel stats to own profile' })
  updateMyYoutubeStats(@CurrentUser() user: User, @Body() dto: UpdateYoutubeStatsDto) {
    return this.profilesService.updateMyYoutubeStats(user.id, dto);
  }

  @Get('influencers/:id')
  @ApiOperation({ summary: 'Get influencer profile by id (public)' })
  getInfluencerById(@Param('id') id: string) {
    return this.profilesService.getInfluencerById(id);
  }
}
