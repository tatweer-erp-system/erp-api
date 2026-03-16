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
import { LeaveRequestStatus } from '@/common/enums/hr.enums';

@ApiTags('HR - Leave Requests')
@Controller('leave-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaveRequestsController {
  constructor(private readonly hrService: HrService) {}

  @Get()
  @ApiOperation({ summary: 'List leave requests for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiOkResponse({ description: 'Paginated list of leave requests' })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('employeeId') employeeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('status') status?: LeaveRequestStatus,
    @Query('year') year?: string,
  ) {
    return this.hrService.findAllLeaveRequests(
      branchId,
      { employeeId, leaveTypeId, status, year: year ? +year : undefined },
      +page,
      +limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave request by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request details' })
  findById(@Param('id') id: string) {
    return this.hrService.findLeaveRequestById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new leave request' })
  @ApiCreatedResponse({ description: 'Leave request created' })
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthenticatedUser) {
    return this.hrService.createLeaveRequest({ ...body, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.hrService.updateLeaveRequest(id, version, { ...data, updatedBy: user.id });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request approved' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hrService.approveLeaveRequest(id, user.id);
  }

  @Post(':id/refuse')
  @ApiOperation({ summary: 'Refuse leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request refused' })
  refuse(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.hrService.refuseLeaveRequest(id, body.reason);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel leave request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave request cancelled' })
  cancel(@Param('id') id: string) {
    return this.hrService.cancelLeaveRequest(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete leave request (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Leave request deleted' })
  remove(@Param('id') id: string) {
    return this.hrService.deleteLeaveRequest(id);
  }
}
