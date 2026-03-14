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
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsArray, IsDateString, IsString, IsUUID } from 'class-validator';
import { AttendanceService } from '../services/attendance.service';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { AttendanceReportQueryDto } from '../dto/attendance-report-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

class ImportAttendanceRowDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ example: '2026-03-13' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '2026-03-13T08:00:00Z' })
  @IsString()
  clockIn!: string;

  @ApiProperty({ example: '2026-03-13T16:00:00Z' })
  @IsString()
  clockOut!: string;
}

class ImportAttendanceDto {
  @ApiProperty({ type: [ImportAttendanceRowDto] })
  @IsArray()
  records!: ImportAttendanceRowDto[];
}

@ApiTags('HR - Attendance')
@Controller('hr/attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ModuleFeature('hr')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Create an attendance record (check in / create)' })
  @ApiCreatedResponse({ description: 'Attendance record created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Patch(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Update attendance record (check out / update)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Attendance record updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Get('reports')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Attendance reports — aggregated per employee in a date range' })
  @ApiOkResponse({ description: 'Attendance report data' })
  getReports(@TenantId() tenantId: string, @Query() query: AttendanceReportQueryDto) {
    return this.attendanceService.getReport(tenantId, query);
  }

  @Post('import')
  @Permissions('hr:manage')
  @ApiOperation({
    summary:
      'Bulk import attendance records (JSON array of { employeeId, date, clockIn, clockOut })',
  })
  @ApiCreatedResponse({ description: 'Import results with success/failed counts' })
  importRecords(
    @TenantId() tenantId: string,
    @Body() dto: ImportAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.importFromCsv(tenantId, dto.records, {
      userId: user.id,
      tenantId,
    });
  }

  @Get()
  @Permissions('hr:view')
  @ApiOperation({ summary: 'List attendance records' })
  @ApiOkResponse({ description: 'Paginated attendance records' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto & { employeeId?: string }) {
    return this.attendanceService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('hr:view')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'Attendance record details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.attendanceService.findById(tenantId, id);
  }

  @Delete(':id')
  @Permissions('hr:manage')
  @ApiOperation({ summary: 'Soft delete attendance record' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiNoContentResponse({ description: 'Attendance record deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.remove(tenantId, id, { userId: user.id, tenantId });
  }
}
