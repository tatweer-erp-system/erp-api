import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @ApiProperty({ description: 'Setting key' })
  @IsString()
  key!: string;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  value!: string;

  @ApiProperty({ description: 'Setting group', required: false })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiProperty({ description: 'Setting type', required: false })
  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ description: 'Array of settings to update', type: [SettingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings!: SettingItemDto[];
}
