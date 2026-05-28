import { Router } from 'express'
import { bookingService, BOOKING_PAYMENT_TTL_MS } from '../services/BookingService'
import { paymentService } from '../services/PaymentService'
import { seatsDB, bookingsDB, invoicesDB } from '../infrastructure/InMemoryDB'
import { scheduleService } from '../services/ScheduleService'

const router = Router()

// Endpoint untuk cek jadwal (mendemonstrasikan cache)
router.get('/schedules', async (req, res) => {
  const schedules = await scheduleService.getSchedules()
  res.json(schedules)
})

// Endpoint untuk list kursi
router.get('/seats', (req, res) => {
  res.json(Array.from(seatsDB.values()))
})

// Endpoint untuk list booking
router.get('/bookings', (req, res) => {
  res.json(Array.from(bookingsDB.values()))
})

// Endpoint untuk list invoice
router.get('/invoices', (req, res) => {
  res.json(Array.from(invoicesDB.values()))
})

// Endpoint UTAMA: Booking tiket
router.post('/booking', async (req, res) => {
  const { userId, scheduleId, seatId } = req.body

  if (!userId || !scheduleId || !seatId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // 1. Cek ketersediaan kursi (harus sesuai dengan seatId yang sudah terikat schedule)
  const seat = seatsDB.get(seatId)
  if (!seat || seat.status !== 'AVAILABLE' || seat.scheduleId !== scheduleId) {
    return res.status(400).json({ error: 'Seat is not available or does not match schedule' })
  }

  // 2. Buat booking dan reserve kursi. Payment diproses lewat endpoint terpisah.
  const bookingId = bookingService.createBooking(userId, scheduleId, seatId)

  res.json({
    message: 'Booking initiated. Complete payment before TTL expires.',
    bookingId,
    paymentUrl: `/payment/${bookingId}`,
    expiresInMs: BOOKING_PAYMENT_TTL_MS
  })
})

// Endpoint untuk request payment setelah booking berhasil dibuat
router.post('/payment/:bookingId', async (req, res) => {
  const bookingId = req.params.bookingId
  const { paymentMethod, simulateFail } = req.body

  if (!bookingId) {
    return res.status(400).json({ error: 'Missing bookingId' })
  }

  if (!paymentMethod) {
    return res.status(400).json({ error: 'Missing paymentMethod' })
  }

  const result = await paymentService.requestPayment(bookingId, paymentMethod, Boolean(simulateFail))
  return res.status(result.statusCode).json(result)
})

export default router
