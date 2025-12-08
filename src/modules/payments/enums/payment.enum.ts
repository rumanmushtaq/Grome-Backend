export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  INTERNAL = 'internal',
  OTHER = 'other',
}
