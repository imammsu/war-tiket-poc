import { Router } from 'express'
import { bookingService } from '../services/BookingService'
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

// Endpoint UTAMA: Booking tiket (hanya lock seat, payment manual)
router.post('/booking', async (req, res) => {
  const { userId, scheduleId, seatId, paymentMethod } = req.body

  if (!userId || !scheduleId || !seatId || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // 1. Cek ketersediaan kursi (harus sesuai dengan seatId yang sudah terikat schedule)
  const seat = seatsDB.get(seatId)
  if (!seat || seat.status !== 'AVAILABLE' || seat.scheduleId !== scheduleId) {
    return res.status(400).json({ error: 'Seat is not available or does not match schedule' })
  }

  // 2. Buat booking (ini akan trigger SEAT_LOCKED event)
  const bookingId = bookingService.createBooking(userId, scheduleId, seatId, paymentMethod)

  res.json({
    message: 'Booking created. Proceed to payment endpoint to complete payment.',
    bookingId,
    paymentUrl: `/booking/payment/${bookingId}`
  })
})

// Endpoint BARU: Manual Payment
router.post('/booking/payment/:bookingId', async (req, res) => {
  const { bookingId } = req.params
  const { simulateFail } = req.body

  const result = await paymentService.processManualPayment(bookingId, simulateFail === true)

  if (result.success) {
    return res.json({ message: result.message, bookingId })
  } else {
    return res.status(400).json({ error: result.message })
  }
})

export default router
