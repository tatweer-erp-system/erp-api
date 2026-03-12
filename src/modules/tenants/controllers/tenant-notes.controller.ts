import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantNotesService } from '../services/tenant-notes.service';
import { CreateTenantNoteDto } from '../dto/create-tenant-note.dto';
import { UpdateTenantNoteDto } from '../dto/update-tenant-note.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Tenant Notes')
@Controller('tenants/:tenantId/notes')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class TenantNotesController {
  constructor(private readonly tenantNotesService: TenantNotesService) {}

  @Get()
  @ApiOperation({ summary: 'List notes for a tenant (paginated)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenant notes' })
  findAll(@Param('tenantId') tenantId: string, @Query() query: PaginationDto) {
    return this.tenantNotesService.findAll(tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a note for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantNotesService.create(tenantId, dto, user.email, { userId: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tenant note' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Note UUID' })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantNotesService.update(id, dto, { userId: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a tenant note' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'id', description: 'Note UUID' })
  @ApiResponse({ status: 204, description: 'Note deleted' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantNotesService.remove(id, { userId: user.id });
  }
}
