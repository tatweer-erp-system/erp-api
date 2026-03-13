import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PosTerminal } from '../entities/pos-terminal.entity';

@Injectable()
export class PosTerminalsRepository extends BaseRepository<PosTerminal> {
  constructor() {
    super(PosTerminal, true);
  }
}
