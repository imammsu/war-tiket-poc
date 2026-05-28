import { bookingsDB } from '../infrastructure/InMemoryDB'
import { eventBus } from '../infrastructure/EventBus'
import { redisSimulator } from '../infrastructure/RedisSimulator'

export const BOOKING_PAYMENT_TTL_MS = 15000

/**
 * [SERVICE] BookingService
 * Menangani logika pembuatan booking dan koordinasi Saga.
 */
export class BookingService {
  constructor() {
    this.registerListeners()
  }

  private registerListeners() {
    // SAGA STEP: Menerima konfirmasi kursi berhasil dikunci
    eventBus.on('SEAT_LOCKED', (payload) => this.handleSeatLocked(payload))
    // SAGA COMPENSATING TRANSACTION: Kursi gagal dikunci
    eventBus.on('SEAT_LOCK_FAILED', (payload) => this.handleSeatLockFailed(payload))
    // SAGA STEP: Menerima konfirmasi pembayaran sukses
    eventBus.on('PAYMENT_SUCCESS', (payload) => this.handlePaymentSuccess(payload))
    // SAGA COMPENSATING TRANSACTION: Pembayaran gagal
    eventBus.on('PAYMENT_FAILED', (payload) => this.handlePaymentFailed(payload))
    // SAGA STEP: Menerima notifikasi dari Redis DLX jika waktu bayar habis
    eventBus.on('DLX:BOOKING_EXPIRED', (payload) => this.handleExpired(payload))
  }

  public createBooking(userId: string, scheduleId: string, seatId: string) {
    const bookingId = `BK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const booking = {
      id: bookingId,
      userId,
      scheduleId,
      seatId,
      status: 'PENDING' as const
    }
    bookingsDB.set(bookingId, booking)
    console.log(`[BOOKING-SERVICE] 📝 Booking ${bookingId} created for user ${userId} on schedule ${scheduleId}`)
    
    // SAGA START: Inisiasi reservasi kursi. Payment dipicu endpoint terpisah.
    eventBus.publishToTopicExchange('BOOKING_INITIATED', { bookingId, scheduleId, seatId, userId })
    return bookingId
  }

  private handleSeatLocked(payload: { bookingId: string; seatId: string }) {
    console.log(`[BOOKING-SERVICE] ⏱️ Setting TTL for booking ${payload.bookingId}`)
    // [PATTERN] TIME-BASED CIRCUIT: Mengatur batas waktu pembayaran di Redis
    redisSimulator.setWithExpiry(`booking_ttl:${payload.bookingId}`, payload, BOOKING_PAYMENT_TTL_MS)
  }

  private handleSeatLockFailed(payload: { bookingId: string }) {
    const booking = bookingsDB.get(payload.bookingId)
    if (booking && booking.status === 'PENDING') {
      booking.status = 'CANCELLED'
      console.log(`[BOOKING-SERVICE] ❌ Booking ${payload.bookingId} cancelled because seat lock failed`)
    }
  }

  private handlePaymentSuccess(payload: { bookingId: string; paymentMethod?: string }) {
    const booking = bookingsDB.get(payload.bookingId)
    if (booking && booking.status === 'PAYMENT_PROCESSING') {
      booking.status = 'PAID'
      if (payload.paymentMethod) {
        booking.paymentMethod = payload.paymentMethod
      }
      console.log(`[BOOKING-SERVICE] ✅ Booking ${payload.bookingId} status updated to PAID`)
      redisSimulator.del(`booking_ttl:${payload.bookingId}`)
    }
  }

  private handlePaymentFailed(payload: { bookingId: string }) {
    const booking = bookingsDB.get(payload.bookingId)
    if (booking && booking.status === 'PAYMENT_PROCESSING') {
      booking.status = 'CANCELLED'
      console.log(`[BOOKING-SERVICE] ❌ Booking ${payload.bookingId} CANCELLED (Payment Failed)`)
      redisSimulator.del(`booking_ttl:${payload.bookingId}`)
    }
  }

  private handleExpired(payload: { bookingId: string }) {
    const booking = bookingsDB.get(payload.bookingId)
    if (booking && booking.status === 'PENDING') {
      booking.status = 'EXPIRED'
      console.log(`[BOOKING-SERVICE] 🔴 Booking ${payload.bookingId} EXPIRED`)
    }
  }
}

export const bookingService = new BookingService()
