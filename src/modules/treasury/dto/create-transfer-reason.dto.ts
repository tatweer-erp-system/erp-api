import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTransferReasonDto {
  @ApiProperty({ description: 'Transfer reason name in English' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Transfer reason name in Arabic' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Whether the transfer reason is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
