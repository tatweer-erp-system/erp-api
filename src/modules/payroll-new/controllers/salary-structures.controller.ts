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
import { SalaryStructuresService } from '../services/salary-structures.service';
import { CreateSalaryStructureDto } from '../dto/create-salary-structure.dto';
import { UpdateSalaryStructureDto } from '../dto/update-salary-structure.dto';
import { CreateSalaryRuleDto } from '../dto/create-salary-rule.dto';
import { UpdateSalaryRuleDto } from '../dto/update-salary-rule.dto';

@ApiTags('Salary Structures')
@Controller('salary-structures')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SalaryStructuresController {
  constructor(private readonly salaryStructuresService: SalaryStructuresService) {}

  // ── Salary Structures ─────────────────────────────────────────────────────

  @Get()
  @Permissions('payroll:view')
  @ApiOperation({ summary: 'List all salary structures' })
  @ApiOkResponse({ description: 'Paginated list of salary structures' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.salaryStructuresService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('payroll:view')
  @ApiOperation({ summary: 'Get salary structure by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Salary structure details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salaryStructuresService.findById(tenantId, id);
  }

  @Post()
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Create a new salary structure' })
  @ApiCreatedResponse({ description: 'Salary structure created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSalaryStructureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryStructuresService.create(tenantId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Put(':id')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Update salary structure' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Salary structure updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalaryStructureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryStructuresService.update(tenantId, id, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Delete salary structure (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Salary structure deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryStructuresService.delete(tenantId, id, {
      userId: user.id,
      tenantId,
    });
  }

  // ── Salary Rules (nested under structure) ─────────────────────────────────

  @Get(':id/rules')
  @Permissions('payroll:view')
  @ApiOperation({ summary: 'List rules for a salary structure' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Structure ID' })
  @ApiOkResponse({ description: 'List of salary rules' })
  findRules(@TenantId() tenantId: string, @Param('id') structureId: string) {
    return this.salaryStructuresService.findRulesByStructure(tenantId, structureId);
  }

  @Post(':id/rules')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Add a rule to a salary structure' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Structure ID' })
  @ApiCreatedResponse({ description: 'Salary rule created' })
  createRule(
    @TenantId() tenantId: string,
    @Param('id') structureId: string,
    @Body() dto: CreateSalaryRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryStructuresService.createRule(tenantId, structureId, dto, {
      userId: user.id,
      tenantId,
    });
  }
}

@ApiTags('Salary Rules')
@Controller('salary-rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SalaryRulesController {
  constructor(private readonly salaryStructuresService: SalaryStructuresService) {}

  @Put(':id')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Update a salary rule' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Salary rule updated' })
  updateRule(
    @TenantId() tenantId: string,
    @Param('id') ruleId: string,
    @Body() dto: UpdateSalaryRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryStructuresService.updateRule(tenantId, ruleId, dto, {
      userId: user.id,
      tenantId,
    });
  }

  @Delete(':id')
  @Permissions('payroll:manage')
  @ApiOperation({ summary: 'Delete a salary rule (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Salary rule deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRule(
    @TenantId() tenantId: string,
    @Param('id') ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryStructuresService.deleteRule(tenantId, ruleId, {
      userId: user.id,
      tenantId,
    });
  }
}
