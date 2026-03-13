import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PosCashier } from '../entities/pos-cashier.entity';

@Injectable()
export class PosCashiersRepository extends BaseRepository<PosCashier> {
  constructor() {
    super(PosCashier, true);
  }
}
