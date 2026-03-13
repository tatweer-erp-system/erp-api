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
import { TrainingService } from '../services/training.service';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Training')
@Controller('hr/training')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post()
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Create a training record' })
  @ApiCreatedResponse({ description: 'Training record created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTrainingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trainingService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @Permissions('hr:read')
  @ApiOperation({ summary: 'List training records' })
  @ApiOkResponse({ description: 'Paginated training records' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto & { employeeId?: string }) {
    return this.trainingService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:read')
  @ApiOperation({ summary: 'Get training record by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Training record details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.trainingService.findById(tenantId, id);
  }

  @Patch(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Update training record' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Training record updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trainingService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Soft delete training record' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiNoContentResponse({ description: 'Training record deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trainingService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
