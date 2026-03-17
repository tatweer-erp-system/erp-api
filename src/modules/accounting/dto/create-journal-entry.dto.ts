import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JournalEntryType } from '@/common/enums/accounting.enums';
import { JournalEntryTypeNew } from '@/common/enums/accounting-new.enums';
import { CreateJournalLineDto } from './create-journal-line.dto';

export class CreateJournalEntryDto {
  @ApiPropertyOptional({ enum: JournalEntryType, default: JournalEntryType.MANUAL })
  @IsOptional()
  @IsEnum(JournalEntryType)
  entryType?: JournalEntryType = JournalEntryType.MANUAL;

  @ApiPropertyOptional({
    enum: JournalEntryTypeNew,
    description: 'Granular entry type: invoice, payment, stock, payroll, manual, reversal',
  })
  @IsOptional()
  @IsEnum(JournalEntryTypeNew)
  entryTypeNew?: JournalEntryTypeNew;

  @ApiPropertyOptional({
    description:
      'Journal ID — links this entry to a specific journal (sale, purchase, cash, bank, general)',
  })
  @IsOptional()
  @IsUUID()
  journalId?: string;

  @ApiProperty({ example: '2026-03-13' })
  @IsDateString()
  entryDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiProperty({ type: [CreateJournalLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateJournalLineDto)
  lines!: CreateJournalLineDto[];
}
