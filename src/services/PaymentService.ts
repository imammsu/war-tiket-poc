import { bookingsDB } from '../infrastructure/InMemoryDB'
import { eventBus } from '../infrastructure/EventBus'
import { redisSimulator } from '../infrastructure/RedisSimulator'
import { BCAStrategy } from '../patterns/strategy/BCAStrategy'
import { MandiriStrategy } from '../patterns/strategy/MandiriStrategy'
import { QRISStrategy } from '../patterns/strategy/QRISStrategy'
import { EWalletStrategy } from '../patterns/strategy/EWalletStrategy'
import { FailedPaymentStrategy } from '../patterns/strategy/FailedPaymentStrategy'
import { PaymentGatewayProxy } from '../patterns/proxy/PaymentGatewayProxy'
import { PaymentStrategy } from '../patterns/strategy/PaymentStrategy'

type PaymentResult = {
  ok: boolean
  statusCode: number
  bookingId?: string
  status?: string
  message?: string
  error?: string
}

type PaymentStartResult = {
  ok: true
  booking: NonNullable<ReturnType<typeof bookingsDB.get>>
} | {
  ok: false
  result: PaymentResult
}

/**
 * [SERVICE] PaymentService
 * Menangani transaksi pembayaran menggunakan Strategy Pattern.
 */
export class PaymentService {
  public async requestPayment(bookingId: string, paymentMethod: string, simulateFail: boolean = false): Promise<PaymentResult> {
    const paymentStrategy = this.createStrategy(paymentMethod, simulateFail)
    if (!paymentStrategy) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Unsupported payment method'
      }
    }

    const paymentStart = this.startPaymentWindow(bookingId)
    if (!paymentStart.ok) {
      return paymentStart.result
    }

    console.log(`[PAYMENT-SERVICE] 💳 Processing payment for booking ${bookingId} via ${paymentMethod}`)

    const proxy = new PaymentGatewayProxy(paymentStrategy)
    const success = await proxy.processPayment(150000)

    if (!this.isPaymentProcessing(bookingId)) {
      return this.expiredOrInvalidResult(bookingId)
    }

    const payload = {
      bookingId,
      seatId: paymentStart.booking.seatId,
      paymentMethod: paymentStrategy.getName()
    }

    if (success) {
      eventBus.publishToTopicExchange('PAYMENT_SUCCESS', payload)
      return {
        ok: true,
        statusCode: 200,
        bookingId,
        status: 'PAID',
        message: 'Payment success. Invoice generated.'
      }
    }

    eventBus.publishToTopicExchange('PAYMENT_FAILED', payload)
    return {
      ok: false,
      statusCode: 402,
      bookingId,
      status: 'CANCELLED',
      error: 'Payment failed by selected payment strategy'
    }
  }

  private createStrategy(paymentMethod: string, simulateFail: boolean): PaymentStrategy | null {
    let strategy: PaymentStrategy

    switch (paymentMethod.trim().toUpperCase()) {
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
      case 'EWALLET':
        strategy = new EWalletStrategy()
        break
      default:
        return null
    }

    return simulateFail ? new FailedPaymentStrategy(strategy) : strategy
  }

  private startPaymentWindow(bookingId: string): PaymentStartResult {
    const booking = bookingsDB.get(bookingId)
    if (!booking || booking.status !== 'PENDING') {
      return {
        ok: false,
        result: this.expiredOrInvalidResult(bookingId)
      }
    }

    const ttlKey = `booking_ttl:${bookingId}`
    redisSimulator.expireIfNeeded(ttlKey)

    if (booking.status !== 'PENDING') {
      return {
        ok: false,
        result: this.expiredOrInvalidResult(bookingId)
      }
    }

    if (!redisSimulator.hasActiveExpiry(ttlKey)) {
      eventBus.publishToDLX('BOOKING_EXPIRED', {
        bookingId,
        seatId: booking.seatId
      })
      return {
        ok: false,
        result: this.expiredOrInvalidResult(bookingId)
      }
    }

    redisSimulator.del(ttlKey)
    booking.status = 'PAYMENT_PROCESSING'
    console.log(`[PAYMENT-SERVICE] ⏱️ TTL stopped because payment request was received for booking ${bookingId}`)
    return {
      ok: true,
      booking
    }
  }

  private isPaymentProcessing(bookingId: string) {
    const booking = bookingsDB.get(bookingId)
    return booking?.status === 'PAYMENT_PROCESSING'
  }

  private expiredOrInvalidResult(bookingId: string): PaymentResult {
    const booking = bookingsDB.get(bookingId)
    if (!booking) {
      return {
        ok: false,
        statusCode: 404,
        error: 'Booking not found'
      }
    }

    if (booking.status === 'EXPIRED') {
      return {
        ok: false,
        statusCode: 409,
        bookingId,
        status: 'EXPIRED',
        error: 'Booking expired. Payment is no longer allowed.'
      }
    }

    return {
      ok: false,
      statusCode: 409,
      bookingId,
      status: booking.status,
      error: `Booking cannot be paid because status is ${booking.status}`
    }
  }
}

export const paymentService = new PaymentService()
