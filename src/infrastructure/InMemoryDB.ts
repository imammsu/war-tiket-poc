export interface Seat {
  id: string
  scheduleId: string // Menghubungkan kursi ke jadwal tertentu
  name: string
  status: 'AVAILABLE' | 'RESERVED' | 'CONFIRMED'
}

export interface Booking {
  id: string
  userId: string
  scheduleId: string // Referensi jadwal yang dipesan
  seatId: string
  status: 'PENDING' | 'PAYMENT_PROCESSING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  paymentMethod?: string
}

export interface Invoice {
  id: string
  bookingId: string
  amount: number
  status: 'UNPAID' | 'PAID'
}

export const seatsDB = new Map<string, Seat>()
export const bookingsDB = new Map<string, Booking>()
export const invoicesDB = new Map<string, Invoice>()

// Seed data untuk Jadwal 1 (SCH-001)
seatsDB.set('SCH001-A01', { id: 'SCH001-A01', scheduleId: 'SCH-001', name: 'Gerbong 1 - 1A', status: 'AVAILABLE' })
seatsDB.set('SCH001-A02', { id: 'SCH001-A02', scheduleId: 'SCH-001', name: 'Gerbong 1 - 2A', status: 'AVAILABLE' })

// Seed data untuk Jadwal 2 (SCH-002)
seatsDB.set('SCH002-A01', { id: 'SCH002-A01', scheduleId: 'SCH-002', name: 'Gerbong 1 - 1A', status: 'AVAILABLE' })
seatsDB.set('SCH002-A02', { id: 'SCH002-A02', scheduleId: 'SCH-002', name: 'Gerbong 1 - 2A', status: 'AVAILABLE' })
