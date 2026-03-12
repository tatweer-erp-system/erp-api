import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TenantNote } from '../entities/tenant-note.entity';

@Injectable()
export class TenantNotesRepository extends BaseRepository<TenantNote> {
  constructor() {
    super(TenantNote);
  }
}
