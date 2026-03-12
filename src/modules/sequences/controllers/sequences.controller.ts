import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { SequencesService } from '../services/sequences.service';
import { CreateSequenceDto } from '../dto/create-sequence.dto';
import { UpdateSequenceDto } from '../dto/update-sequence.dto';
import { ResetSequenceDto } from '../dto/reset-sequence.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Sequences')
@Controller('sequences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  @Get()
  @Permissions('settings:view')
  @ApiOperation({ summary: 'List all sequences for the current tenant' })
  @ApiOkResponse({ description: 'List of sequence configurations' })
  findAll(@TenantId() tenantId: string) {
    return this.sequencesService.findAll(tenantId);
  }

  @Post()
  @Permissions('settings:manage_sequences')
  @ApiOperation({ summary: 'Create a new sequence configuration' })
  @ApiCreatedResponse({ description: 'Sequence configuration created' })
  create(@TenantId() tenantId: string, @Body() dto: CreateSequenceDto) {
    return this.sequencesService.create(tenantId, dto);
  }

  @Put(':id')
  @Permissions('settings:manage_sequences')
  @ApiOperation({ summary: 'Update sequence configuration (optimistic locking via version)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Sequence configuration updated' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateSequenceDto) {
    return this.sequencesService.update(id, tenantId, dto);
  }

  @Post(':id/reset')
  @Permissions('settings:manage_sequences')
  @ApiOperation({ summary: 'Reset sequence counter to zero (ZATCA sequences are blocked)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Sequence counter reset' })
  reset(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ResetSequenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sequencesService.reset(id, tenantId, dto, user.id);
  }
}
