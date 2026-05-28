import { eventBus } from '../infrastructure/EventBus'

export class NotificationService {
  constructor() {
    this.registerListeners()
  }

  private registerListeners() {
    eventBus.on('PAYMENT_SUCCESS', (payload) => this.send(`Selamat! Pembayaran untuk booking ${payload.bookingId} berhasil.`))
    eventBus.on('PAYMENT_FAILED', (payload) => this.send(`Maaf, pembayaran untuk booking ${payload.bookingId} gagal.`))
    eventBus.on('DLX:BOOKING_EXPIRED', (payload) => this.send(`Waktu pembayaran untuk booking ${payload.bookingId} telah habis.`))
  }

  private send(message: string) {
    console.log(`[NOTIFICATION-SERVICE] Push Notification: "${message}"`)
  }
}

export const notificationService = new NotificationService()
