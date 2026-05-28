import { seatsDB } from '../infrastructure/InMemoryDB'
import { eventBus } from '../infrastructure/EventBus'

/**
 * [SERVICE] SeatService
 * Mengelola ketersediaan kursi menggunakan State Management.
 */
export class SeatService {
  constructor() {
    this.registerListeners()
  }

  private registerListeners() {
    // SAGA STEP: Menanggapi inisiasi booking
    eventBus.on('BOOKING_INITIATED', (payload) => this.handleBookingInitiated(payload))
    // SAGA STEP: Sukses - Update status kursi jadi CONFIRMED
    eventBus.on('PAYMENT_SUCCESS', (payload) => this.handlePaymentSuccess(payload))
    // SAGA COMPENSATING TRANSACTION: Gagal bayar - Kembalikan status ke AVAILABLE
    eventBus.on('PAYMENT_FAILED', (payload) => this.handlePaymentFailed(payload))
    // SAGA COMPENSATING TRANSACTION: Waktu habis - Kembalikan status ke AVAILABLE
    eventBus.on('DLX:BOOKING_EXPIRED', (payload) => this.handleExpired(payload))
  }

  private handleBookingInitiated(payload: { seatId: string; bookingId: string }) {
    const seat = seatsDB.get(payload.seatId)
    // [PATTERN] STATE MANAGEMENT: Transisi dari AVAILABLE ke RESERVED
    if (seat && seat.status === 'AVAILABLE') {
      seat.status = 'RESERVED'
      console.log(`[SEAT-SERVICE] 🔒 Seat ${payload.seatId} LOCKED for booking ${payload.bookingId}`)
      eventBus.publishToTopicExchange('SEAT_LOCKED', payload)
    } else {
      console.error(`[SEAT-SERVICE] ❌ Seat ${payload.seatId} is NOT AVAILABLE`)
      eventBus.publishToTopicExchange('SEAT_LOCK_FAILED', payload)
    }
  }

  private handlePaymentSuccess(payload: { seatId: string }) {
    const seat = seatsDB.get(payload.seatId)
    if (seat && seat.status === 'RESERVED') {
      seat.status = 'CONFIRMED'
      console.log(`[SEAT-SERVICE] ✅ Seat ${payload.seatId} CONFIRMED`)
    } else {
      console.log(`[SEAT-SERVICE] ⚠️ Ignored PAYMENT_SUCCESS for seat ${payload.seatId} because it is not RESERVED (current status: ${seat?.status ?? 'NOT_FOUND'})`)
    }
  }

  private handlePaymentFailed(payload: { seatId: string }) {
    const seat = seatsDB.get(payload.seatId)
    if (seat) {
      seat.status = 'AVAILABLE'
      console.log(`[SEAT-SERVICE] 🔓 Seat ${payload.seatId} RELEASED (Payment Failed)`)
    }
  }

  private handleExpired(payload: { bookingId: string; seatId: string }) {
    const seat = seatsDB.get(payload.seatId)
    if (seat && seat.status === 'RESERVED') {
      seat.status = 'AVAILABLE'
      console.log(`[SEAT-SERVICE] 🔓 Seat ${payload.seatId} RELEASED (Expired)`)
    }
  }
}

export const seatService = new SeatService()
