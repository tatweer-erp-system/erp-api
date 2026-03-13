import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IssueGiftCardDto {
  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  @Min(0.01)
  initialBalance!: number;

  @ApiPropertyOptional({ example: 'SAR', default: 'SAR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipientEmail?: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  recipientPhone?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  issuedOrderId?: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
