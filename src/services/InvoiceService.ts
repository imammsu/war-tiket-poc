import { invoicesDB } from '../infrastructure/InMemoryDB'
import { eventBus } from '../infrastructure/EventBus'

export class InvoiceService {
  constructor() {
    this.registerListeners()
  }

  private registerListeners() {
    eventBus.on('SEAT_LOCKED', (payload) => this.handleSeatLocked(payload))
    eventBus.on('PAYMENT_SUCCESS', (payload) => this.handlePaymentSuccess(payload))
  }

  private handleSeatLocked(payload: { bookingId: string }) {
    const invoiceId = `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    invoicesDB.set(invoiceId, {
      id: invoiceId,
      bookingId: payload.bookingId,
      amount: 150000,
      status: 'UNPAID'
    })
    console.log(`[INVOICE-SERVICE] 📄 Invoice ${invoiceId} generated for booking ${payload.bookingId}`)
  }

  private handlePaymentSuccess(payload: { bookingId: string }) {
    for (const invoice of invoicesDB.values()) {
      if (invoice.bookingId === payload.bookingId) {
        invoice.status = 'PAID'
        console.log(`[INVOICE-SERVICE] ✅ Invoice ${invoice.id} status updated to PAID`)
      }
    }
  }
}

export const invoiceService = new InvoiceService()
