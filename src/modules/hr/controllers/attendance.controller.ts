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
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { HrService } from '../services/hr.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { AttendanceStatus } from '@/common/enums/hr.enums';

@ApiTags('HR - Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly hrService: HrService) {}

  @Get()
  @ApiOperation({ summary: 'List attendance records for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiOkResponse({ description: 'Paginated list of attendance records' })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('employeeId') employeeId?: string,
    @Query('date') date?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: AttendanceStatus,
  ) {
    return this.hrService.findAllAttendance(
      branchId,
      {
        employeeId,
        date,
        month: month ? +month : undefined,
        year: year ? +year : undefined,
        status,
      },
      +page,
      +limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Attendance record details' })
  findById(@Param('id') id: string) {
    return this.hrService.findAttendanceById(id);
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Check in employee' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiCreatedResponse({ description: 'Check-in recorded' })
  checkIn(@Headers('x-branch-id') branchId: string, @Body() body: { employeeId: string }) {
    return this.hrService.checkIn(body.employeeId, branchId);
  }

  @Post('check-out')
  @ApiOperation({ summary: 'Check out employee' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiOkResponse({ description: 'Check-out recorded' })
  checkOut(@Headers('x-branch-id') branchId: string, @Body() body: { employeeId: string }) {
    return this.hrService.checkOut(body.employeeId, branchId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update attendance record' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Attendance record updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.hrService.updateAttendance(id, version, { ...data, updatedBy: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete attendance record (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Attendance record deleted' })
  remove(@Param('id') id: string) {
    return this.hrService.deleteAttendance(id);
  }
}
