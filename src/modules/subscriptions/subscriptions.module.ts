import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '@/database/sql/entities/subscription.entity';
import { Plan } from '@/database/sql/entities/plan.entity';
import { SubscriptionsRepository } from '@/database/sql/repositories/subscriptions.repository';
import { PlansRepository } from '@/database/sql/repositories/plans.repository';
import { PlansService } from './services/plans.service';
import { PlansController } from './controllers/plans.controller';
import { PaymentService } from './services/payment.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Plan])],
  controllers: [PlansController, SubscriptionsController],
  providers: [
    PlansService,
    PaymentService,
    SubscriptionsService,
    SubscriptionGuard,
    SubscriptionsRepository,
    PlansRepository,
  ],
  exports: [SubscriptionsService, SubscriptionGuard],
})
export class SubscriptionsModule {}
