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
    ],
    procedure: [
      '1. GET /schedules untuk lihat jadwal tersedia.',
      '2. GET /seats untuk lihat kursi dan status AVAILABLE.',
      '3. POST /booking dengan body { userId, scheduleId, seatId, paymentMethod }.',
      '4. Untuk simulasi gagal bayar, tambahkan simulateFail: true.',
      '5. Untuk simulasi timeout bayar, tambahkan simulateExpiry: true atau tunggu 15 detik.',
      '6. Lihat booking di GET /bookings dan kursi di GET /seats setelah proses selesai/timeout.'
    ],
    examples: {
      success: 'curl -X POST http://localhost:3000/booking -H "Content-Type: application/json" -d "{\"userId\":\"U1\",\"scheduleId\":\"SCH-001\",\"seatId\":\"SCH001-A01\",\"paymentMethod\":\"BCA\"}"',
      paymentFail: 'curl -X POST http://localhost:3000/booking -H "Content-Type: application/json" -d "{\"userId\":\"U1\",\"scheduleId\":\"SCH-001\",\"seatId\":\"SCH001-A01\",\"paymentMethod\":\"BCA\",\"simulateFail\":true}"',
      timeout: 'curl -X POST http://localhost:3000/booking -H "Content-Type: application/json" -d "{\"userId\":\"U1\",\"scheduleId\":\"SCH-001\",\"seatId\":\"SCH001-A01\",\"paymentMethod\":\"BCA\",\"simulateExpiry\":true}"',
      postman: 'POST http://localhost:3000/booking, pilih Body -> raw -> JSON. Gunakan payload di atas sesuai skenario.'
    }
  })
})

app.use('/', bookingRoutes)

app.listen(PORT, () => {
  console.log('================================================')
  console.log(`🚀 [SERVER] Berjalan di http://localhost:${PORT}`)
  console.log('================================================')
  console.log('Prosedur pengujian POC:')
  console.log('1. Buka GET http://localhost:3000/schedules untuk lihat jadwal.')
  console.log('2. Buka GET http://localhost:3000/seats untuk lihat kursi AVAILABLE.')
  console.log('3. Booking dan Payment terpisah:')
  console.log('   a) POST /booking lock seat selama 15 detik:')
  console.log('      curl -X POST http://localhost:3000/booking -H "Content-Type: application/json" -d "{\\\"userId\\\":\\\"U1\\\",\\\"scheduleId\\\":\\\"SCH-001\\\",\\\"seatId\\\":\\\"SCH001-A01\\\",\\\"paymentMethod\\\":\\\"BCA\\\"}"')
  console.log('   b) POST /booking/payment/:bookingId untuk bayar manual:')
  console.log('      curl -X POST http://localhost:3000/booking/payment/<bookingId> -H "Content-Type: application/json" -d "{}"')
  console.log('4. Untuk simulasi gagal pembayaran, gunakan simulateFail: true di payment:')
  console.log('      curl -X POST http://localhost:3000/booking/payment/<bookingId> -H "Content-Type: application/json" -d "{\\\"simulateFail\\\":true}"')
  console.log('5. Jika tidak membayar dalam 15 detik:')
  console.log('   - Booking berubah EXPIRED, kursi kembali AVAILABLE')
  console.log('   - Payment endpoint akan menolak (Booking status bukan PENDING)')
  console.log('6. Cek status di GET /bookings, GET /invoices, dan GET /seats.')
})

export default app
