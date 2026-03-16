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
import { HrDefinitionsService } from '../services/hr-definitions.service';
import { CreateJobTitleDto } from '../dto/create-job-title.dto';
import { UpdateJobTitleDto } from '../dto/update-job-title.dto';
import { CreateEmploymentTypeConfigDto } from '../dto/create-employment-type-config.dto';
import { UpdateEmploymentTypeConfigDto } from '../dto/update-employment-type-config.dto';
import { CreateLeaveTypeConfigDto } from '../dto/create-leave-type-config.dto';
import { UpdateLeaveTypeConfigDto } from '../dto/update-leave-type-config.dto';
import { CreatePublicHolidayDto } from '../dto/create-public-holiday.dto';
import { UpdatePublicHolidayDto } from '../dto/update-public-holiday.dto';
import { CreateTerminationReasonDto } from '../dto/create-termination-reason.dto';
import { UpdateTerminationReasonDto } from '../dto/update-termination-reason.dto';

@ApiTags('HR Definitions')
@Controller('hr/definitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class HrDefinitionsController {
  constructor(private readonly hrDefinitionsService: HrDefinitionsService) {}

  // ── Job Titles ──────────────────────────────────────────────────────────────

  @Get('job-titles')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all job titles' })
  @ApiOkResponse({ description: 'Paginated list of job titles' })
  findAllJobTitles(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.hrDefinitionsService.findAllJobTitles(tenantId, query);
  }

  @Get('job-titles/:id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get job title by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Job title details' })
  findJobTitleById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.hrDefinitionsService.findJobTitleById(tenantId, id);
  }

  @Post('job-titles')
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new job title' })
  @ApiCreatedResponse({ description: 'Job title created' })
  createJobTitle(
    @TenantId() tenantId: string,
    @Body() dto: CreateJobTitleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.createJobTitle(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put('job-titles/:id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update job title' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Job title updated' })
  updateJobTitle(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobTitleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.updateJobTitle(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('job-titles/:id')
  @Permissions('hr:delete')
  @ApiOperation({ summary: 'Delete job title (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Job title deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteJobTitle(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.deleteJobTitle(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Employment Types ────────────────────────────────────────────────────────

  @Get('employment-types')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all employment types' })
  @ApiOkResponse({ description: 'Paginated list of employment types' })
  findAllEmploymentTypes(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.hrDefinitionsService.findAllEmploymentTypes(tenantId, query);
  }

  @Get('employment-types/:id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get employment type by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employment type details' })
  findEmploymentTypeById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.hrDefinitionsService.findEmploymentTypeById(tenantId, id);
  }

  @Post('employment-types')
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new employment type' })
  @ApiCreatedResponse({ description: 'Employment type created' })
  createEmploymentType(
    @TenantId() tenantId: string,
    @Body() dto: CreateEmploymentTypeConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.createEmploymentType(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put('employment-types/:id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update employment type' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employment type updated' })
  updateEmploymentType(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentTypeConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.updateEmploymentType(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('employment-types/:id')
  @Permissions('hr:delete')
  @ApiOperation({ summary: 'Delete employment type (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Employment type deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEmploymentType(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.deleteEmploymentType(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Leave Types ─────────────────────────────────────────────────────────────

  @Get('leave-types')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all leave types' })
  @ApiOkResponse({ description: 'Paginated list of leave types' })
  findAllLeaveTypes(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.hrDefinitionsService.findAllLeaveTypes(tenantId, query);
  }

  @Get('leave-types/:id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get leave type by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave type details' })
  findLeaveTypeById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.hrDefinitionsService.findLeaveTypeById(tenantId, id);
  }

  @Post('leave-types')
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new leave type' })
  @ApiCreatedResponse({ description: 'Leave type created' })
  createLeaveType(
    @TenantId() tenantId: string,
    @Body() dto: CreateLeaveTypeConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.createLeaveType(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put('leave-types/:id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update leave type' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave type updated' })
  updateLeaveType(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.updateLeaveType(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('leave-types/:id')
  @Permissions('hr:delete')
  @ApiOperation({ summary: 'Delete leave type (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Leave type deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLeaveType(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.deleteLeaveType(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Public Holidays ─────────────────────────────────────────────────────────

  @Get('public-holidays')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all public holidays' })
  @ApiOkResponse({ description: 'Paginated list of public holidays' })
  findAllPublicHolidays(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.hrDefinitionsService.findAllPublicHolidays(tenantId, query);
  }

  @Get('public-holidays/:id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get public holiday by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Public holiday details' })
  findPublicHolidayById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.hrDefinitionsService.findPublicHolidayById(tenantId, id);
  }

  @Post('public-holidays')
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new public holiday' })
  @ApiCreatedResponse({ description: 'Public holiday created' })
  createPublicHoliday(
    @TenantId() tenantId: string,
    @Body() dto: CreatePublicHolidayDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.createPublicHoliday(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put('public-holidays/:id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update public holiday' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Public holiday updated' })
  updatePublicHoliday(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePublicHolidayDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.updatePublicHoliday(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('public-holidays/:id')
  @Permissions('hr:delete')
  @ApiOperation({ summary: 'Delete public holiday (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Public holiday deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePublicHoliday(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.deletePublicHoliday(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Termination Reasons ─────────────────────────────────────────────────────

  @Get('termination-reasons')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List all termination reasons' })
  @ApiOkResponse({ description: 'Paginated list of termination reasons' })
  findAllTerminationReasons(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.hrDefinitionsService.findAllTerminationReasons(tenantId, query);
  }

  @Get('termination-reasons/:id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get termination reason by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Termination reason details' })
  findTerminationReasonById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.hrDefinitionsService.findTerminationReasonById(tenantId, id);
  }

  @Post('termination-reasons')
  @Permissions('hr:create')
  @ApiOperation({ summary: 'Create a new termination reason' })
  @ApiCreatedResponse({ description: 'Termination reason created' })
  createTerminationReason(
    @TenantId() tenantId: string,
    @Body() dto: CreateTerminationReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.createTerminationReason(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put('termination-reasons/:id')
  @Permissions('hr:update')
  @ApiOperation({ summary: 'Update termination reason' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Termination reason updated' })
  updateTerminationReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTerminationReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.updateTerminationReason(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete('termination-reasons/:id')
  @Permissions('hr:delete')
  @ApiOperation({ summary: 'Delete termination reason (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Termination reason deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTerminationReason(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hrDefinitionsService.deleteTerminationReason(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }
}
