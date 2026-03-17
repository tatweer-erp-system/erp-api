import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * DTO for changing a lead's CRM stage.
 * Stage transitions update the lead's probability from the target stage.
 */
export class ChangeStageDto {
  @ApiProperty({ description: 'Target CRM stage ID' })
  @IsUUID()
  stageId!: string;
}
