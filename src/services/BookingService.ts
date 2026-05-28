import { bookingsDB } from '../infrastructure/InMemoryDB'
import { eventBus } from '../infrastructure/EventBus'
import { redisSimulator } from '../infrastructure/RedisSimulator'

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
    // SAGA STEP: Menerima konfirmasi pembayaran sukses
    eventBus.on('PAYMENT_SUCCESS', (payload) => this.handlePaymentSuccess(payload))
    // SAGA STEP: Menerima notifikasi dari Redis DLX jika waktu bayar habis
    eventBus.on('DLX:BOOKING_EXPIRED', (payload) => this.handleExpired(payload))
  }

  public createBooking(userId: string, scheduleId: string, seatId: string, paymentMethod: string, simulateFail: boolean = false, simulateExpiry: boolean = false) {
    const bookingId = `BK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const booking = {
      id: bookingId,
      userId,
      scheduleId,
      seatId,
      status: 'PENDING' as const,
      paymentMethod
    }
    bookingsDB.set(bookingId, booking)
    console.log(`[BOOKING-SERVICE] 📝 Booking ${bookingId} created for user ${userId} on schedule ${scheduleId}`)
    
    // SAGA START: Inisiasi proses pemesanan (Choreography)
    eventBus.publishToTopicExchange('BOOKING_INITIATED', { bookingId, scheduleId, seatId, userId, paymentMethod, simulateFail, simulateExpiry })
    return bookingId
  }

  private handleSeatLocked(payload: { bookingId: string; seatId: string; simulateFail?: boolean }) {
    console.log(`[BOOKING-SERVICE] ⏱️ Setting TTL for booking ${payload.bookingId}`)
    // [PATTERN] TIME-BASED CIRCUIT: Mengatur batas waktu pembayaran di Redis
    redisSimulator.setWithExpiry(`booking_ttl:${payload.bookingId}`, payload, 15000)
  }

  private handlePaymentSuccess(payload: { bookingId: string }) {
    const booking = bookingsDB.get(payload.bookingId)
    if (booking) {
      booking.status = 'PAID'
      console.log(`[BOOKING-SERVICE] ✅ Booking ${payload.bookingId} status updated to PAID`)
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
