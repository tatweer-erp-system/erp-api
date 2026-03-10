import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FirebaseService } from '../../../infrastructure/firebase/firebase.service';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { QUEUE_FCM } from '../../../infrastructure/queues/queue.constants';

export interface FcmJobData {
  tenantSlug: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Processor(QUEUE_FCM)
export class FcmProcessor {
  private readonly logger = new Logger(FcmProcessor.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly tenantSequelizeService: TenantSequelizeService,
  ) {}

  @Process('send')
  async handleSend(job: Job<FcmJobData>): Promise<void> {
    const { tenantSlug, userId, title, body, data } = job.data;

    try {
      const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
      const [rows] = await sequelize.query(
        `SELECT token FROM user_fcm_tokens WHERE user_id = :userId AND is_active = true`,
        { replacements: { userId }, type: 'SELECT' } as any,
      );

      const tokens = (rows as any[]).map((r) => r.token);
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
