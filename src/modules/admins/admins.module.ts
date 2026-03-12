import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminsController } from './controllers/admins.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminsService } from './services/admins.service';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { AdminNotificationsRepository } from '@/database/sql/repositories/admin-notifications.repository';

@Module({
  imports: [AuthModule],
  controllers: [AdminNotificationsController, AdminsController],
  providers: [AdminsService, AdminNotificationsService, AdminNotificationsRepository],
  exports: [AdminsService, AdminNotificationsService],
})
export class AdminsModule {}
