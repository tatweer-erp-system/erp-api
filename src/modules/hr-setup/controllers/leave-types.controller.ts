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
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { LeaveTypesService } from '../services/leave-types.service';
import { CreateLeaveTypeDto } from '../dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from '../dto/update-leave-type.dto';

@ApiTags('Leave Types')
@Controller('hr-setup/leave-types')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  @Get()
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all leave types' })
  @ApiOkResponse({ description: 'Paginated list of leave types' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.leaveTypesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get leave type by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave type details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leaveTypesService.findById(tenantId, id);
  }

  @Post()
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Create a new leave type' })
  @ApiCreatedResponse({ description: 'Leave type created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateLeaveTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leaveTypesService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Update leave type' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave type updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leaveTypesService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Delete leave type (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Leave type deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leaveTypesService.delete(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
