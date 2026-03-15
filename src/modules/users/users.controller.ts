import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get() @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List team members' })
  async findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) { return this.service.findById(tid, id); }

  @Post() @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add team member' })
  async create(@TenantId() tid: string, @Body() dto: any) { return this.service.create(tid, dto); }

  @Patch(':id') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update team member' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(tid, id, dto); }

  @Delete(':id') @Roles('OWNER')
  @ApiOperation({ summary: 'Deactivate team member' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
