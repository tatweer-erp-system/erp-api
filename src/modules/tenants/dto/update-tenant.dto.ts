import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, [
    'adminEmail',
    'adminPassword',
    'adminFirstName_en',
    'adminFirstName_ar',
    'adminLastName_en',
    'adminLastName_ar',
  ] as const),
) {}
