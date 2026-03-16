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
import { ContractStatus } from '@/common/enums/hr.enums';

@ApiTags('HR - Employee Contracts')
@Controller('employee-contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployeeContractsController {
  constructor(private readonly hrService: HrService) {}

  @Get()
  @ApiOperation({ summary: 'List employee contracts for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiOkResponse({ description: 'Paginated list of employee contracts' })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: ContractStatus,
  ) {
    return this.hrService.findAllContracts(branchId, { employeeId, status }, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee contract by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee contract details' })
  findById(@Param('id') id: string) {
    return this.hrService.findContractById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new employee contract' })
  @ApiCreatedResponse({ description: 'Employee contract created' })
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthenticatedUser) {
    return this.hrService.createContract({ ...body, createdBy: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update employee contract' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee contract updated' })
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { version, ...data } = body;
    return this.hrService.updateContract(id, version, { ...data, updatedBy: user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete employee contract (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Employee contract deleted' })
  remove(@Param('id') id: string) {
    return this.hrService.deleteContract(id);
  }
}
