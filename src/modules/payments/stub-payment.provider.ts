import { Injectable } from '@nestjs/common';
import {
  PaymentProviderPort,
  PaymentProviderResult,
} from './payment-provider.port';

@Injectable()
export class StubPaymentProvider implements PaymentProviderPort {
  initiatePayment(
    _amount: string,
    referenceId: string,
  ): Promise<PaymentProviderResult> {
    return Promise.resolve({
      success: true,
      providerRef: `stub_${referenceId}_${Date.now()}`,
    });
  }

  verifyPayment(providerRef: string): Promise<PaymentProviderResult> {
    return Promise.resolve({ success: true, providerRef });
  }
}
