import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeContactDto {
  @ApiProperty({ description: 'ID of the contact to merge into (the surviving contact)' })
  @IsUUID()
  targetContactId!: string;
}
