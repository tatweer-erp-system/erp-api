import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, [
    'adminEmail',
    'adminPassword',
    'adminFirstNameEn',
    'adminFirstNameAr',
    'adminLastNameEn',
    'adminLastNameAr',
  ] as const),
) {}
