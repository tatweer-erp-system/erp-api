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
import { LeaveAllocationStatus } from '@/common/enums/hr.enums';

@ApiTags('HR - Leave Allocations')
@Controller('leave-allocations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaveAllocationsController {
  constructor(private readonly hrService: HrService) {}

  @Get()
  @ApiOperation({ summary: 'List leave allocations for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiOkResponse({ description: 'Paginated list of leave allocations' })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('employeeId') employeeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('status') status?: LeaveAllocationStatus,
    @Query('year') year?: string,
  ) {
    return this.hrService.findAllLeaveAllocations(
      branchId,
      { employeeId, leaveTypeId, status, year: year ? +year : undefined },
      +page,
      +limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave allocation by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave allocation details' })
  findById(@Param('id') id: string) {
    return this.hrService.findLeaveAllocationById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new leave allocation' })
  @ApiCreatedResponse({ description: 'Leave allocation created' })
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthenticatedUser) {
    return this.hrService.createLeaveAllocation({ ...body, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update leave allocation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave allocation updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.hrService.updateLeaveAllocation(id, version, { ...data, updatedBy: user.id });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve leave allocation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave allocation approved' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hrService.approveLeaveAllocation(id, user.id);
  }

  @Post(':id/refuse')
  @ApiOperation({ summary: 'Refuse leave allocation' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave allocation refused' })
  refuse(@Param('id') id: string) {
    return this.hrService.refuseLeaveAllocation(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete leave allocation (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Leave allocation deleted' })
  remove(@Param('id') id: string) {
    return this.hrService.deleteLeaveAllocation(id);
  }
}
