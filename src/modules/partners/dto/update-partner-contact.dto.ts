import { ApiProperty } from '@nestjs/swagger';
import { PartialType, OmitType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreatePartnerContactDto } from './create-partner-contact.dto';

export class UpdatePartnerContactDto extends PartialType(
  OmitType(CreatePartnerContactDto, ['partnerId'] as const),
) {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;
}
