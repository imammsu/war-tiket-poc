import { invoicesDB } from '../infrastructure/InMemoryDB'
import { eventBus } from '../infrastructure/EventBus'

export class InvoiceService {
  constructor() {
    this.registerListeners()
  }

  private registerListeners() {
    eventBus.on('PAYMENT_SUCCESS', (payload) => this.handlePaymentSuccess(payload))
  }

  private handlePaymentSuccess(payload: { bookingId: string }) {
    for (const invoice of invoicesDB.values()) {
      if (invoice.bookingId === payload.bookingId) {
        return
      }
    }

    const invoiceId = `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    invoicesDB.set(invoiceId, {
      id: invoiceId,
      bookingId: payload.bookingId,
      amount: 150000,
      status: 'PAID'
    })
    console.log(`[INVOICE-SERVICE] Invoice ${invoiceId} generated after payment success for booking ${payload.bookingId}`)
  }
}

export const invoiceService = new InvoiceService()
