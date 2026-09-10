export interface PaymentProviderResult {
  success: boolean;
  providerRef?: string;
  errorMessage?: string;
}

export interface PaymentProviderPort {
  initiatePayment(
    amount: string,
    referenceId: string,
  ): Promise<PaymentProviderResult>;
  verifyPayment(providerRef: string): Promise<PaymentProviderResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
