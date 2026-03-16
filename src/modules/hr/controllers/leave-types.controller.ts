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
import { HrService } from '../services/hr.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('HR - Leave Types')
@Controller('leave-types')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaveTypesController {
  constructor(private readonly hrService: HrService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get leave types dropdown' })
  @ApiOkResponse({ description: 'Leave types dropdown list' })
  getDropdown() {
    return this.hrService.getLeaveTypesDropdown();
  }

  @Get()
  @ApiOperation({ summary: 'List all leave types' })
  @ApiOkResponse({ description: 'List of leave types' })
  findAll(@Query('isActive') isActive?: string) {
    const isActiveFilter = isActive !== undefined ? isActive === 'true' : undefined;
    return this.hrService.findAllLeaveTypes(isActiveFilter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave type by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave type details' })
  findById(@Param('id') id: string) {
    return this.hrService.findLeaveTypeById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new leave type' })
  @ApiCreatedResponse({ description: 'Leave type created' })
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthenticatedUser) {
    return this.hrService.createLeaveType({ ...body, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update leave type' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Leave type updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.hrService.updateLeaveType(id, version, { ...data, updatedBy: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete leave type (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Leave type deleted' })
  remove(@Param('id') id: string) {
    return this.hrService.deleteLeaveType(id);
  }
}
