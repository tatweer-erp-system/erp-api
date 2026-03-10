import { Module } from '@nestjs/common';
import { AdminsController } from './controllers/admins.controller';
import { AdminsService } from './services/admins.service';
import { AdminsRepository } from '../../database/repositories/admins.repository';

@Module({
  controllers: [AdminsController],
  providers: [AdminsService, AdminsRepository],
  exports: [AdminsService],
})
export class AdminsModule {}
