import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Plan } from '../../database/entities/plan.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { PlansService } from './services/plans.service';
import { PlansController } from './controllers/plans.controller';
import { PaymentService } from './services/payment.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Global()
@Module({
  imports: [SequelizeModule.forFeature([Plan, Subscription, PaymentTransaction])],
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, PaymentService, SubscriptionsService, SubscriptionGuard],
  exports: [PlansService, PaymentService, SubscriptionsService, SubscriptionGuard],
})
export class SubscriptionsModule {}
