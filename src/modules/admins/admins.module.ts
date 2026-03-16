import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '@/database/sql/entities/admin.entity';
import { AdminNotification } from '@/database/sql/entities/admin-notification.entity';
import { AdminsRepository } from '@/database/sql/repositories/admins.repository';
import { AdminNotificationsRepository } from '@/database/sql/repositories/admin-notifications.repository';
import { AdminsController } from './controllers/admins.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminsService } from './services/admins.service';
import { AdminNotificationsService } from './services/admin-notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, AdminNotification])],
  controllers: [AdminNotificationsController, AdminsController],
  providers: [
    AdminsService,
    AdminNotificationsService,
    AdminsRepository,
    AdminNotificationsRepository,
  ],
  exports: [AdminsService],
})
export class AdminsModule {}
