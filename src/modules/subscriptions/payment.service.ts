import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  RefundResult,
} from './providers/payment-provider.interface';
import { MoyasarProvider } from './providers/moyasar.provider';

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);
  private providers: Map<string, IPaymentProvider> = new Map();
  private activeProviderName: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    // Register Moyasar
    const moyasarConfig = this.configService.get('payment.moyasar');
    if (moyasarConfig?.secretKey) {
      this.providers.set(
        'moyasar',
        new MoyasarProvider(moyasarConfig.secretKey, moyasarConfig.baseUrl),
      );
    }

    // Future providers: register here, e.g. Stripe, HyperPay
    // const stripeKey = this.configService.get<string>('payment.stripe.secretKey');
    // if (stripeKey) this.providers.set('stripe', new StripeProvider(stripeKey));

    this.activeProviderName = this.configService.get<string>('payment.provider') ?? 'moyasar';
    this.logger.log(`Active payment provider: ${this.activeProviderName}`);
  }

  get activeProvider(): IPaymentProvider {
    const provider = this.providers.get(this.activeProviderName);
    if (!provider) {
      throw new Error(
        `Payment provider '${this.activeProviderName}' is not configured. ` +
          `Available providers: ${[...this.providers.keys()].join(', ')}`,
      );
    }
    return provider;
  }

  get providerName(): string {
    return this.activeProviderName;
  }

  createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    return this.activeProvider.createPayment(params);
  }

  verifyPayment(transactionId: string): Promise<PaymentResult> {
    return this.activeProvider.verifyPayment(transactionId);
  }

  refund(transactionId: string, amountInSmallestUnit: number): Promise<RefundResult> {
    return this.activeProvider.refund(transactionId, amountInSmallestUnit);
  }
}
