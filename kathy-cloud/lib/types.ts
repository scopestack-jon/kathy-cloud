// Shared types for Kathy Cloud

export type PaymentStatus = 
  | 'initiated'
  | 'pending'
  | 'paid_pending_consent'
  | 'paid_and_confirmed'
  | 'cancelled'
  | 'failed'
  | 'manual_review'

export interface CreatePaymentRequest {
  invoiceId: string
  amount: number
  currency?: string
  practicePantherInvoiceUrl?: string
  firmId?: string
  userId?: string
  organizationName?: string
  applicationName?: string
  applicationConfigId?: string
  sourceUrl?: string
}

export interface CreatePaymentResponse {
  paymentSessionId: string
  paymentUrl: string
}

export interface PaymentStatusResponse {
  paymentSessionId: string
  status: PaymentStatus
  invoiceId: string
  amount: number
  currency: string
  lastUpdatedAt: string
}

export interface ConfirmPaymentResponse {
  success: boolean
  message: string
}

export interface RunPaymentsSession {
  id: string
  amount: number
  currency: string
  payment_url: string
  status: string
}

export interface WebhookEvent {
  id: string
  type: string
  data: {
    payment_id: string
    amount: number
    currency: string
    status: string
    metadata?: Record<string, any>
  }
}




