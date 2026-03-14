import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Release } from '../../../infrastructure/releases/entities/release.entity';

@Injectable()
export class ReleasesRepository extends BaseRepository<Release> {
  constructor() {
    super(Release, false);
  }
}
