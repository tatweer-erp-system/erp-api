import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PaymentService } from './payment.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Global()
@Module({
  imports: [SequelizeModule.forFeature([Plan, Subscription, PaymentTransaction])],
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, PaymentService, SubscriptionsService, SubscriptionGuard],
  exports: [PlansService, PaymentService, SubscriptionsService, SubscriptionGuard],
})
export class SubscriptionsModule {}
