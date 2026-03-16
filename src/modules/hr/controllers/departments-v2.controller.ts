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

@ApiTags('HR V2 - Departments')
@Controller('v2/departments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepartmentsV2Controller {
  constructor(private readonly hrService: HrService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get departments dropdown' })
  @ApiOkResponse({ description: 'Departments dropdown list' })
  getDropdown() {
    return this.hrService.getDepartmentsDropdown();
  }

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  @ApiOkResponse({ description: 'Paginated list of departments' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveFilter = isActive !== undefined ? isActive === 'true' : undefined;
    return this.hrService.findAllDepartments({ search, isActive: isActiveFilter }, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Department details' })
  findById(@Param('id') id: string) {
    return this.hrService.findDepartmentById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new department' })
  @ApiCreatedResponse({ description: 'Department created' })
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthenticatedUser) {
    return this.hrService.createDepartment({ ...body, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Department updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.hrService.updateDepartment(id, version, { ...data, updatedBy: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete department (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Department deleted' })
  remove(@Param('id') id: string) {
    return this.hrService.deleteDepartment(id);
  }
}
