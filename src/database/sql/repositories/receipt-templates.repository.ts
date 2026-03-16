import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { ReceiptTemplate } from '../entities/receipt-template.entity';

@Injectable()
export class ReceiptTemplatesRepository extends BaseRepository<ReceiptTemplate> {
  constructor() {
    super(ReceiptTemplate, true);
  }
}
