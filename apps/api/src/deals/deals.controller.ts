import {
  Controller,
  Get,
  Post,
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
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { CounterDealDto } from './dto/counter-deal.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../common/entities/user.entity';

@ApiTags('Deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  @ApiOperation({ summary: 'Brand sends offer to influencer' })
  @ApiResponse({ status: 201 })
  create(@CurrentUser() user: User, @Body() dto: CreateDealDto) {
    return this.dealsService.createDeal(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List own deals' })
  list(@CurrentUser() user: User) {
    return this.dealsService.listDeals(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal by id' })
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealsService.getDeal(id, user);
  }

  @Patch(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND, UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Accept deal or counter offer' })
  accept(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealsService.acceptDeal(id, user);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND, UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Reject deal or counter offer' })
  reject(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealsService.rejectDeal(id, user);
  }

  @Patch(':id/counter')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND, UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Counter with a different budget' })
  counter(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: CounterDealDto,
  ) {
    return this.dealsService.counterDeal(id, user, dto);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BRAND)
  @ApiOperation({ summary: 'Brand marks deal as completed' })
  complete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealsService.completeDeal(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a deal (brand or influencer)' })
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealsService.cancelDeal(id, user);
  }
}
