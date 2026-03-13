import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RedeemGiftCardDto {
  @ApiProperty({ example: 'ABCD1234EFGH5678' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
