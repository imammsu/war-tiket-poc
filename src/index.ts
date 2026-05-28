import express from 'express'

// Import services to initialize them (register event listeners)
import './services/SeatService'
import './services/BookingService'
import './services/PaymentService'
import './services/InvoiceService'
import './services/NotificationService'
import bookingRoutes from './routes/booking.routes'

const app = express()
app.use(express.json())

const PORT = 3000

app.get('/', (req, res) => {
  res.json({ 
    message: 'War Tiket PoC - Running',
    endpoints: [
      'GET /schedules',
      'GET /seats',
      'GET /bookings',
      'GET /invoices',
      'POST /booking',
      'POST /payment/:bookingId'
    ]
  })
})

app.use('/', bookingRoutes)

app.listen(PORT, () => {
  console.log('================================================')
  console.log(`[SERVER] Berjalan di http://localhost:${PORT}`)
  console.log('================================================')
  console.log('Gunakan curl atau Postman untuk mencoba skenario:')
  console.log('1. Booking: POST /booking dengan {"userId":"U1","scheduleId":"SCH-001","seatId":"SCH001-A01"}')
  console.log('2. Payment: POST /payment/:bookingId dengan {"paymentMethod":"BCA"}')
  console.log('3. Payment Failed: Tambahkan "simulateFail": true pada request payment')
  console.log('4. TTL Expired: Diamkan 15 detik setelah booking, lalu coba request payment')
})

export default app
