import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProgramsService } from '../services/programs.service';
import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';
import { CreateTierDto } from '../dto/create-tier.dto';
import { UpdateTierDto } from '../dto/update-tier.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Loyalty - Programs')
@ApiBearerAuth()
@ModuleFeature('loyalty')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('loyalty/programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a loyalty program' })
  @Permissions('loyalty:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateProgramDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List loyalty programs' })
  @Permissions('loyalty:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.programsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loyalty program by ID' })
  @Permissions('loyalty:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.programsService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a loyalty program' })
  @Permissions('loyalty:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a loyalty program' })
  @Permissions('loyalty:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programsService.remove(tenantId, id, { userId: user.id, tenantId });
  }

  // ── Tier endpoints ──────────────────────────────────────────────────────────

  @Post(':id/tiers')
  @ApiOperation({ summary: 'Create a tier for a loyalty program' })
  @Permissions('loyalty:manage')
  createTier(
    @TenantId() tenantId: string,
    @Param('id') programId: string,
    @Body() dto: CreateTierDto,
  ) {
    return this.programsService.createTier(tenantId, programId, dto);
  }

  @Patch(':id/tiers/:tierId')
  @ApiOperation({ summary: 'Update a tier for a loyalty program' })
  @Permissions('loyalty:manage')
  updateTier(
    @TenantId() tenantId: string,
    @Param('id') programId: string,
    @Param('tierId') tierId: string,
    @Body() dto: UpdateTierDto,
  ) {
    return this.programsService.updateTier(tenantId, programId, tierId, dto);
  }

  @Delete(':id/tiers/:tierId')
  @ApiOperation({ summary: 'Delete a tier from a loyalty program' })
  @Permissions('loyalty:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTier(
    @TenantId() tenantId: string,
    @Param('id') programId: string,
    @Param('tierId') tierId: string,
  ) {
    return this.programsService.removeTier(tenantId, programId, tierId);
  }
}
