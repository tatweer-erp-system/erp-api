import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'Manager' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

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
