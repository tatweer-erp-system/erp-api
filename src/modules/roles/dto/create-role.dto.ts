import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name in English', example: 'Manager' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nameEn: string;

  @ApiProperty({ description: 'Role name in Arabic', example: 'مدير' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nameAr: string;

  @ApiPropertyOptional({
    description: 'Role description in English',
    example: 'Management access level',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Role description in Arabic', example: 'مستوى وصول الإدارة' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Permission IDs to assign', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
