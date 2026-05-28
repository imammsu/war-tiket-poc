import { PaymentStrategy } from './PaymentStrategy'

export class QRISStrategy implements PaymentStrategy {
  async pay(amount: number): Promise<boolean> {
    console.log(`[PAYMENT] Memproses pembayaran QRIS sebesar Rp${amount}...`)
    return true
  }
  getName(): string {
    return 'QRIS'
  }
}
