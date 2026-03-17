import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PreviewEmailTemplateDto {
  @ApiProperty({ description: 'ID of the record to use for variable resolution' })
  @IsUUID()
  recordId!: string;
}
