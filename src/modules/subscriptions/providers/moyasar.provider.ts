import { Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  IPaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  RefundResult,
} from './payment-provider.interface';

export class MoyasarProvider implements IPaymentProvider {
  readonly name = 'moyasar';
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(MoyasarProvider.name);

  constructor(
    private readonly secretKey: string,
    private readonly baseUrl: string,
  ) {
    this.client = axios.create({
      baseURL: baseUrl,
      auth: { username: secretKey, password: '' },
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const { amount, currency, description, callbackUrl, metadata } = params;

    const response = await this.client.post('/payments', {
      amount, // in halalas (SAR × 100)
      currency,
      description,
      callback_url: callbackUrl,
      source: {
        type: 'creditcard',
      },
      metadata,
    });

    const data = response.data as Record<string, unknown>;
    const source = data.source as Record<string, unknown> | undefined;

    return {
      transactionId: data.id as string,
      status: this.mapStatus(data.status as string),
      paymentUrl: source?.transaction_url as string | undefined,
      raw: data,
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    const response = await this.client.get(`/payments/${transactionId}`);
    const data = response.data as Record<string, unknown>;

    return {
      transactionId: data.id as string,
      status: this.mapStatus(data.status as string),
      raw: data,
    };
  }

  async refund(transactionId: string, amountInSmallestUnit: number): Promise<RefundResult> {
    try {
      const response = await this.client.post(`/payments/${transactionId}/refund`, {
        amount: amountInSmallestUnit,
      });
      const data = response.data as Record<string, unknown>;
      return { transactionId, status: 'refunded', raw: data };
    } catch (error) {
      this.logger.error(`Moyasar refund failed for ${transactionId}`, error);
      return { transactionId, status: 'failed', raw: { error } };
    }
  }

  private mapStatus(moyasarStatus: string): 'pending' | 'paid' | 'failed' {
    switch (moyasarStatus) {
      case 'paid':
        return 'paid';
      case 'failed':
      case 'refunded':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
