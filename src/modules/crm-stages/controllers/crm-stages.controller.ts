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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CrmStagesService } from '../services/crm-stages.service';
import { CreateCrmStageDto } from '../dto/create-crm-stage.dto';
import { UpdateCrmStageDto } from '../dto/update-crm-stage.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('CRM - Stages')
@Controller('crm-stages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CrmStagesController {
  constructor(private readonly crmStagesService: CrmStagesService) {}

  @Get()
  @Permissions('crm:view')
  @ApiOperation({ summary: 'List all CRM stages ordered by sequence' })
  @ApiOkResponse({ description: 'Paginated list of CRM stages' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.crmStagesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('crm:view')
  @ApiOperation({ summary: 'Get CRM stage by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'CRM stage details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.crmStagesService.findById(tenantId, id);
  }

  @Post()
  @Permissions('crm:manage')
  @ApiOperation({ summary: 'Create a CRM stage' })
  @ApiCreatedResponse({ description: 'CRM stage created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCrmStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crmStagesService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Put(':id')
  @Permissions('crm:manage')
  @ApiOperation({ summary: 'Update a CRM stage' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'CRM stage updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCrmStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crmStagesService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('crm:manage')
  @ApiOperation({ summary: 'Soft delete a CRM stage' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'CRM stage deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crmStagesService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
