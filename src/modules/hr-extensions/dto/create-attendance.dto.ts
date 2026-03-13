import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { AttendanceSource, AttendanceStatus } from '@/common/enums/hr.enums';

export class CreateAttendanceDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ example: '2026-03-13' })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @ApiPropertyOptional({ example: '2026-03-13T08:00:00Z' })
  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @ApiPropertyOptional({ example: '2026-03-13T16:00:00Z' })
  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ enum: AttendanceSource, default: AttendanceSource.MANUAL })
  @IsOptional()
  @IsEnum(AttendanceSource)
  source?: AttendanceSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
