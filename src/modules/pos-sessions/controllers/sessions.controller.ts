import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PosSessionsService } from '../services/sessions.service';
import { OpenSessionDto } from '../dto/open-session.dto';
import { CloseSessionDto } from '../dto/close-session.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('POS - Sessions')
@ApiBearerAuth()
@ModuleFeature('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/sessions')
export class SessionsController {
  constructor(private readonly posSessionsService: PosSessionsService) {}

  @Post('open')
  @ApiOperation({ summary: 'Open a new POS session' })
  @Permissions('pos:session')
  open(
    @TenantId() tenantId: string,
    @Body() dto: OpenSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.posSessionsService.openSession(tenantId, dto, { userId: user.id, tenantId });
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a POS session' })
  @Permissions('pos:session')
  close(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CloseSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.posSessionsService.closeSession(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current open session for the authenticated cashier' })
  @Permissions('pos:session')
  getCurrent(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.posSessionsService.getCurrentSession(tenantId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all POS sessions' })
  @Permissions('pos:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.posSessionsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a POS session by ID' })
  @Permissions('pos:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.posSessionsService.findById(tenantId, id);
  }
}
