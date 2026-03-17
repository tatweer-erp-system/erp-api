import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BranchSettingItemDto {
  @ApiProperty({ description: 'Setting key' })
  @IsString()
  @MaxLength(100)
  key!: string;

  @ApiProperty({ description: 'Setting value (null to clear)', nullable: true })
  @IsOptional()
  @IsString()
  value!: string | null;
}

export class UpdateBranchSettingsDto {
  @ApiProperty({ description: 'Array of key-value pairs to upsert', type: [BranchSettingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchSettingItemDto)
  settings!: BranchSettingItemDto[];
}
