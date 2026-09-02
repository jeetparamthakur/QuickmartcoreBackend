import { Injectable } from '@nestjs/common';
import {
  PaymentProviderPort,
  PaymentProviderResult,
} from './payment-provider.port';

@Injectable()
export class StubPaymentProvider implements PaymentProviderPort {
  async initiatePayment(
    _amount: string,
    referenceId: string,
  ): Promise<PaymentProviderResult> {
    return {
      success: true,
      providerRef: `stub_${referenceId}_${Date.now()}`,
    };
  }

  async verifyPayment(providerRef: string): Promise<PaymentProviderResult> {
    return { success: true, providerRef };
  }
}
