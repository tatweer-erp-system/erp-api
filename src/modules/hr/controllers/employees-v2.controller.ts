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

@ApiTags('HR V2 - Employees')
@Controller('v2/employees')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployeesV2Controller {
  constructor(private readonly hrService: HrService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get employees dropdown' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiOkResponse({ description: 'Employees dropdown list' })
  getDropdown(@Headers('x-branch-id') branchId: string) {
    return this.hrService.getEmployeesDropdown(branchId);
  }

  @Get()
  @ApiOperation({ summary: 'List employees for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiOkResponse({ description: 'Paginated list of employees' })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveFilter = isActive !== undefined ? isActive === 'true' : undefined;
    return this.hrService.findAllEmployees(
      branchId,
      { search, departmentId, isActive: isActiveFilter },
      +page,
      +limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee details' })
  findById(@Param('id') id: string) {
    return this.hrService.findEmployeeById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiCreatedResponse({ description: 'Employee created' })
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthenticatedUser) {
    return this.hrService.createEmployee({ ...body, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update employee' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.hrService.updateEmployee(id, version, { ...data, updatedBy: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete employee (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Employee deleted' })
  remove(@Param('id') id: string) {
    return this.hrService.deleteEmployee(id);
  }
}
