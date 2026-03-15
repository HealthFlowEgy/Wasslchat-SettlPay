import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ValidateCouponDto } from './dto/create-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Coupons')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private service: CouponsService) {}

  @Get() @ApiOperation({ summary: 'List coupons' })
  async findAll(@TenantId() tid: string, @Query('includeExpired') ie: string) { return this.service.findAll(tid, ie === 'true'); }

  @Post() @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create coupon' })
  async create(@TenantId() tid: string, @Body() dto: CreateCouponDto) { return this.service.create(tid, dto); }

  @Post('validate') @ApiOperation({ summary: 'Validate coupon code against order total' })
  async validate(@TenantId() tid: string, @Body() dto: ValidateCouponDto) { return this.service.validate(tid, dto.code, dto.orderTotal); }

  @Patch(':id') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update coupon' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) { return this.service.update(tid, id, dto); }

  @Delete(':id') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete coupon' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
