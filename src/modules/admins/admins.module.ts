import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminsController } from './controllers/admins.controller';
import { AdminsService } from './services/admins.service';
import { AdminsRepository } from '../../database/repositories/admins.repository';

@Module({
  imports: [JwtModule],
  controllers: [AdminsController],
  providers: [AdminsService, AdminsRepository],
  exports: [AdminsService],
})
export class AdminsModule {}
