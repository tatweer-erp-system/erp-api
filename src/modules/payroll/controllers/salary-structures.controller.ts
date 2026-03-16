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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PayrollService } from '@/modules/payroll/services/payroll.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { StructureType } from '@/common/enums/payroll.enums';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salary-structures')
export class SalaryStructuresController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get salary structures dropdown list' })
  findForDropdown() {
    return this.payrollService.structuresDropdown();
  }

  @Get()
  @ApiOperation({ summary: 'List salary structures' })
  @ApiQuery({ name: 'structureType', required: false, enum: StructureType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('structureType') structureType?: StructureType,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payrollService.findAllStructures(
      {
        structureType,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get salary structure with rules by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findById(@Param('id') id: string) {
    return this.payrollService.findStructureWithRules(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create salary structure' })
  create(@Body() body: Record<string, any>) {
    return this.payrollService.createStructure(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update salary structure' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.payrollService.updateStructure(id, version, data);
  }

  @Post(':id/rules')
  @ApiOperation({ summary: 'Upsert rules for a salary structure' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  upsertRules(@Param('id') id: string, @Body() body: { rules: Record<string, any>[] }) {
    return this.payrollService.upsertRules(id, body.rules ?? []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete salary structure' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.payrollService.removeStructure(id);
  }
}
