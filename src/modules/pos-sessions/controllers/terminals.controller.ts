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
import { TerminalsService } from '../services/terminals.service';
import { CreateTerminalDto } from '../dto/create-terminal.dto';
import { UpdateTerminalDto } from '../dto/update-terminal.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('POS - Terminals')
@ApiBearerAuth()
@ModuleFeature('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/terminals')
export class TerminalsController {
  constructor(private readonly terminalsService: TerminalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a POS terminal' })
  @Permissions('pos:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTerminalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.terminalsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'List all POS terminals' })
  @Permissions('pos:view')
  findAll(@TenantId() tenantId: string, @Query() pagination: PaginationDto) {
    return this.terminalsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a POS terminal by ID' })
  @Permissions('pos:view')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.terminalsService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a POS terminal' })
  @Permissions('pos:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTerminalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.terminalsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a POS terminal' })
  @Permissions('pos:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.terminalsService.remove(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/ping')
  @Public()
  @ApiOperation({ summary: 'Update terminal last_seen_at timestamp' })
  @HttpCode(HttpStatus.NO_CONTENT)
  ping(@Param('id') id: string) {
    return this.terminalsService.ping(id);
  }
}
