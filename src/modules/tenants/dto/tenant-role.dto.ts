import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTenantRoleDto {
  @ApiProperty({ description: 'Role name (English)', example: 'Manager' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nameEn: string;

  @ApiProperty({ description: 'Role name (Arabic)', example: 'مدير' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nameAr: string;

  @ApiPropertyOptional({
    description: 'Role description (English)',
    example: 'Management access level',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Role description (Arabic)', example: 'مستوى وصول الإدارة' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Permission keys to assign', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateTenantRoleDto {
  @ApiPropertyOptional({ description: 'Role name (English)', example: 'Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Role name (Arabic)', example: 'مدير' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameAr?: string;

  @ApiPropertyOptional({
    description: 'Role description (English)',
    example: 'Management access level',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Role description (Arabic)', example: 'مستوى وصول الإدارة' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Permission keys to assign', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
