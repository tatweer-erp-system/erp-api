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
import { JobPositionsService } from '../services/job-positions.service';
import { CreateJobPositionDto } from '../dto/create-job-position.dto';
import { UpdateJobPositionDto } from '../dto/update-job-position.dto';

@ApiTags('Job Positions')
@Controller('hr-setup/job-positions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class JobPositionsController {
  constructor(private readonly jobPositionsService: JobPositionsService) {}

  @Get()
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all job positions' })
  @ApiOkResponse({ description: 'Paginated list of job positions' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.jobPositionsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get job position by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Job position details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.jobPositionsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Create a new job position' })
  @ApiCreatedResponse({ description: 'Job position created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateJobPositionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobPositionsService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Update job position' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Job position updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobPositionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobPositionsService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Delete job position (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Job position deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobPositionsService.delete(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
