import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FirebaseService } from '@/infrastructure/firebase/firebase.service';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { QUEUE_FCM } from '@/infrastructure/queues/queue.constants';
import { FcmJobData } from '../interfaces/notification.interface';

@Processor(QUEUE_FCM)
export class FcmProcessor {
  private readonly logger = new Logger(FcmProcessor.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  @Process('send')
  async handleSend(job: Job<FcmJobData>): Promise<void> {
    const { tenantId, userId, title, body, data } = job.data;

    try {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();
      const rows = await sequelize.query(
        `SELECT token FROM user_fcm_tokens WHERE "userId" = :userId AND "tenantId" = :tenantId AND "isActive" = true`,
        { replacements: { userId, tenantId }, type: 'SELECT' } as any,
      );

      const tokens = (rows as unknown as any[]).map((r) => r.token);
      if (tokens.length === 0) return;

      const stringData = data
        ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        : {};

      await this.firebaseService.sendPushNotification(tokens, title, body, stringData);
      this.logger.log(`FCM sent to user ${userId} (${tokens.length} devices)`);
    } catch (err) {
      this.logger.error(`FCM failed for user ${userId}`, err);
      throw err;
    }
  }
}
