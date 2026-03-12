import { PartialType } from '@nestjs/swagger';
import { CreateTenantNoteDto } from './create-tenant-note.dto';

export class UpdateTenantNoteDto extends PartialType(CreateTenantNoteDto) {}
