import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { PayrollService } from '@/modules/payroll/services/payroll.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PayslipStatus } from '@/common/enums/payroll.enums';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payslips')
export class PayslipsController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @ApiOperation({ summary: 'List payslips for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PayslipStatus })
  @ApiQuery({ name: 'periodFrom', required: false })
  @ApiQuery({ name: 'periodTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: PayslipStatus,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payrollService.findAllPayslips(
      branchId,
      { employeeId, status, periodFrom, periodTo },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payslip with lines by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findById(@Param('id') id: string) {
    return this.payrollService.findPayslipWithLines(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create payslip' })
  create(@Body() body: Record<string, any>) {
    return this.payrollService.createPayslip(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payslip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.payrollService.updatePayslip(id, version, data);
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Upsert lines for a payslip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  upsertLines(@Param('id') id: string, @Body() body: { lines: Record<string, any>[] }) {
    return this.payrollService.upsertPayslipLines(id, body.lines ?? []);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm payslip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  confirm(@Param('id') id: string) {
    return this.payrollService.confirmPayslip(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel payslip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  cancel(@Param('id') id: string) {
    return this.payrollService.cancelPayslip(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payslip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.payrollService.removePayslip(id);
  }
}
