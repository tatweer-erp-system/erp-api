import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class GenerateApiKeyDto {
  @ApiProperty({ description: 'Name for the API key', example: 'Production API Key' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
