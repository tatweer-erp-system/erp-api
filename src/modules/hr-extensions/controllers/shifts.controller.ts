import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ShiftsService } from '../services/shifts.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Shifts')
@Controller('hr/shifts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Create a shift' })
  @ApiCreatedResponse({ description: 'Shift created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shiftsService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @Permissions('hr:read')
  @ApiOperation({ summary: 'List all shifts' })
  @ApiOkResponse({ description: 'Paginated list of shifts' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.shiftsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get shift by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Shift details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.shiftsService.findById(tenantId, id);
  }

  @Patch(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Update a shift' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Shift updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shiftsService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Soft delete a shift' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiNoContentResponse({ description: 'Shift deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shiftsService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
