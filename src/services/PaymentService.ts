import { eventBus } from '../infrastructure/EventBus'
import { BCAStrategy } from '../patterns/strategy/BCAStrategy'
import { MandiriStrategy } from '../patterns/strategy/MandiriStrategy'
import { QRISStrategy } from '../patterns/strategy/QRISStrategy'
import { EWalletStrategy } from '../patterns/strategy/EWalletStrategy'
import { PaymentGatewayProxy } from '../patterns/proxy/PaymentGatewayProxy'
import { PaymentStrategy } from '../patterns/strategy/PaymentStrategy'

/**
 * [SERVICE] PaymentService
 * Menangani transaksi pembayaran menggunakan Strategy Pattern.
 */
export class PaymentService {
  constructor() {
    this.registerListeners()
  }

  private registerListeners() {
    // SAGA STEP: Menanggapi kursi yang sudah berhasil dikunci
    eventBus.on('SEAT_LOCKED', (payload) => this.handleSeatLocked(payload))
  }

  private async handleSeatLocked(payload: any) {
    const { bookingId, paymentMethod, simulateFail, simulateExpiry } = payload
    console.log(`[PAYMENT-SERVICE] 💳 Processing payment for booking ${bookingId} via ${paymentMethod}`)

    if (simulateExpiry) {
      // Simulasi delay panjang untuk memicu TIME-BASED CIRCUIT (TTL)
      console.log(`[PAYMENT-SERVICE] ⏳ Simulating long payment delay (20s) for TTL expiry test...`)
      await new Promise(resolve => setTimeout(resolve, 20000))
    }

    // [PATTERN] STRATEGY: Memilih metode pembayaran secara dinamis
    let strategy: PaymentStrategy
    switch (paymentMethod) {
      case 'BCA': strategy = new BCAStrategy(); break
      case 'MANDIRI': strategy = new MandiriStrategy(); break
      case 'QRIS': strategy = new QRISStrategy(); break
      case 'E-WALLET': strategy = new EWalletStrategy(); break
      default: strategy = new QRISStrategy()
    }

    const proxy = new PaymentGatewayProxy(strategy)
    const success = await proxy.processPayment(150000, simulateFail)

    if (success) {
      // SAGA SUCCESS STEP
      eventBus.publishToTopicExchange('PAYMENT_SUCCESS', payload)
    } else {
      // SAGA FAILED STEP -> Memicu Kompensasi
      eventBus.publishToTopicExchange('PAYMENT_FAILED', payload)
    }
  }
}

export const paymentService = new PaymentService()
