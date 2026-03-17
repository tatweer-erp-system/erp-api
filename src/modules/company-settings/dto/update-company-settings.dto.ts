import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCompanySettingsDto {
  // ─── Accounting defaults ──────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Default Accounts Receivable account ID' })
  @IsOptional()
  @IsUUID()
  defaultARAccountId?: string;

  @ApiPropertyOptional({ description: 'Default Accounts Payable account ID' })
  @IsOptional()
  @IsUUID()
  defaultAPAccountId?: string;

  @ApiPropertyOptional({ description: 'Default Cost of Goods Sold account ID' })
  @IsOptional()
  @IsUUID()
  defaultCOGSAccountId?: string;

  @ApiPropertyOptional({ description: 'Default Inventory account ID' })
  @IsOptional()
  @IsUUID()
  defaultInventoryAccountId?: string;

  // ─── Tax & fiscal ─────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Tax exigibility: invoice_basis or payment_basis' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxExigibility?: string;

  @ApiPropertyOptional({ description: 'Fiscal lock date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fiscalLockDate?: string;

  @ApiPropertyOptional({ description: 'Tax lock date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  taxLockDate?: string;

  @ApiPropertyOptional({ description: 'Use Anglo-Saxon accounting model' })
  @IsOptional()
  @IsBoolean()
  angloSaxonAccounting?: boolean;

  // ─── Inventory ────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Stock costing method: avco, fifo, standard' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  stockCostingMethod?: string;

  @ApiPropertyOptional({ description: 'Block sales when stock is negative' })
  @IsOptional()
  @IsBoolean()
  negativeStockBlock?: boolean;

  @ApiPropertyOptional({ description: 'Enable automatic reorder rules' })
  @IsOptional()
  @IsBoolean()
  autoReorder?: boolean;

  // ─── Sales & invoicing ────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Invoice policy: on_delivery or on_order' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  invoicePolicy?: string;

  @ApiPropertyOptional({ description: 'Block orders exceeding credit limit' })
  @IsOptional()
  @IsBoolean()
  creditLimitBlock?: boolean;

  @ApiPropertyOptional({ description: 'Warn when approaching credit limit' })
  @IsOptional()
  @IsBoolean()
  creditLimitWarning?: boolean;

  // ─── Purchasing ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Enable three-way matching (PO, Receipt, Invoice)' })
  @IsOptional()
  @IsBoolean()
  threeWayMatch?: boolean;

  @ApiPropertyOptional({ description: 'Three-way match tolerance percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threeWayMatchTolerance?: number;

  @ApiPropertyOptional({ description: 'Bill control: on_receipt or on_order' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  billControl?: string;

  // ─── HR & payroll ─────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Working days per month' })
  @IsOptional()
  @IsInt()
  @Min(1)
  workDaysPerMonth?: number;

  @ApiPropertyOptional({ description: 'Working hours per day' })
  @IsOptional()
  @IsInt()
  @Min(1)
  workHoursPerDay?: number;

  @ApiPropertyOptional({ description: 'Overtime rate multiplier' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  overtimeRate?: number;

  @ApiPropertyOptional({ description: 'Enable late deduction from salary' })
  @IsOptional()
  @IsBoolean()
  lateDeductionEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Late tolerance in minutes before deduction' })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateToleranceMinutes?: number;

  @ApiPropertyOptional({ description: 'GOSI employee percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gosiEmployeePct?: number;

  @ApiPropertyOptional({ description: 'GOSI employer percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gosiEmployerPct?: number;

  @ApiPropertyOptional({ description: 'Income tax method: bracket or flat' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  incomeTaxMethod?: string;

  @ApiPropertyOptional({ description: 'Enable End of Service Calculation' })
  @IsOptional()
  @IsBoolean()
  eoscEnabled?: boolean;

  @ApiPropertyOptional({ description: 'EOSC base: last_wage or average_wage' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  eoscBase?: string;

  @ApiPropertyOptional({ description: 'Allow negative leave balance' })
  @IsOptional()
  @IsBoolean()
  negativeLeaveAllowed?: boolean;

  @ApiPropertyOptional({ description: 'Optimistic locking version' })
  @IsOptional()
  @IsInt()
  @Min(0)
  version?: number;
}
