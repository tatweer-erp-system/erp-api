import { Module, Global } from '@nestjs/common';
import { PlansService } from './services/plans.service';
import { PlansController } from './controllers/plans.controller';
import { PaymentService } from './services/payment.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Global()
@Module({
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, PaymentService, SubscriptionsService, SubscriptionGuard],
  exports: [SubscriptionsService, SubscriptionGuard],
})
export class SubscriptionsModule {}
