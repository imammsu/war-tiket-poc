import express from 'express'
import bookingRoutes from './routes/booking.routes'

// Import services to initialize them (register event listeners)
import './services/SeatService'
import './services/BookingService'
import './services/PaymentService'
import './services/InvoiceService'
import './services/NotificationService'

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
      'POST /booking'
    ]
  })
})

app.use('/', bookingRoutes)

app.listen(PORT, () => {
  console.log('================================================')
  console.log(`🚀 [SERVER] Berjalan di http://localhost:${PORT}`)
  console.log('================================================')
  console.log('Gunakan curl atau Postman untuk mencoba skenario:')
  console.log('1. Happy Path: POST /booking dengan {"userId":"U1","seatId":"ST-A01","paymentMethod":"BCA"}')
  console.log('2. Payment Failed: Tambahkan "simulateFail": true')
  console.log('3. TTL Expired: Diamkan selama 15 detik setelah booking')
})

export default app
