import { eventBus } from '../infrastructure/EventBus'
import { bookingsDB } from '../infrastructure/InMemoryDB'
import { BCAStrategy } from '../patterns/strategy/BCAStrategy'
import { MandiriStrategy } from '../patterns/strategy/MandiriStrategy'
import { QRISStrategy } from '../patterns/strategy/QRISStrategy'
import { EWalletStrategy } from '../patterns/strategy/EWalletStrategy'
import { PaymentGatewayProxy } from '../patterns/proxy/PaymentGatewayProxy'
import { PaymentStrategy } from '../patterns/strategy/PaymentStrategy'

/**
 * [SERVICE] PaymentService
 * Menangani transaksi pembayaran menggunakan Strategy Pattern.
 * Payment dipicu manual, bukan otomatis.
 */
export class PaymentService {
  /**
   * Proses pembayaran manual untuk booking yang pending
   */
  public async processManualPayment(bookingId: string, simulateFail: boolean = false): Promise<{ success: boolean; message: string }> {
    const booking = bookingsDB.get(bookingId)

    if (!booking) {
      return { success: false, message: 'Booking not found' }
    }

    if (booking.status !== 'PENDING') {
      return { success: false, message: `Booking status is ${booking.status}, cannot process payment` }
    }

    console.log(`[PAYMENT-SERVICE] 💳 Processing manual payment for booking ${bookingId} via ${booking.paymentMethod}`)

    // [PATTERN] STRATEGY: Memilih metode pembayaran secara dinamis
    let strategy: PaymentStrategy
    switch (booking.paymentMethod) {
      case 'BCA':
        strategy = new BCAStrategy()
        break
      case 'MANDIRI':
        strategy = new MandiriStrategy()
        break
      case 'QRIS':
        strategy = new QRISStrategy()
        break
      case 'E-WALLET':
        strategy = new EWalletStrategy()
        break
      default:
        strategy = new QRISStrategy()
    }

    const proxy = new PaymentGatewayProxy(strategy)
    const success = await proxy.processPayment(150000, simulateFail)

    if (success) {
      // SAGA SUCCESS STEP
      eventBus.publishToTopicExchange('PAYMENT_SUCCESS', { bookingId, seatId: booking.seatId })
      return { success: true, message: 'Payment successful' }
    } else {
      // SAGA FAILED STEP -> Memicu Kompensasi
      eventBus.publishToTopicExchange('PAYMENT_FAILED', { bookingId, seatId: booking.seatId })
      return { success: false, message: 'Payment failed' }
    }
  }
}

export const paymentService = new PaymentService()
