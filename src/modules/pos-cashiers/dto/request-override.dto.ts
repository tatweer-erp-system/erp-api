import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ManagerOverrideAction } from '@/common/enums/pos.enums';

export class RequestOverrideDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  sessionId!: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({
    example: 'high_discount',
    enum: ManagerOverrideAction,
  })
  @IsEnum(ManagerOverrideAction)
  @IsNotEmpty()
  actionType!: ManagerOverrideAction;

  @ApiPropertyOptional({
    example: {
      requestedPct: 25,
      orderTotal: 500,
      orderId: '550e8400-e29b-41d4-a716-446655440000',
    },
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
