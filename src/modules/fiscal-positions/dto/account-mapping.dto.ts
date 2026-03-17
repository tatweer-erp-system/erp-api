import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AccountMappingDto {
  @ApiProperty({ description: 'Source account ID to be replaced' })
  @IsUUID()
  accountSrcId!: string;

  @ApiProperty({ description: 'Destination account ID' })
  @IsUUID()
  accountDestId!: string;
}
