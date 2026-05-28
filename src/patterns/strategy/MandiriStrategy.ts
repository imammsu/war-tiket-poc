import { PaymentStrategy } from './PaymentStrategy'

export class MandiriStrategy implements PaymentStrategy {
  async pay(amount: number): Promise<boolean> {
    console.log(`[PAYMENT] Memproses pembayaran Mandiri sebesar Rp${amount}...`)
    return true
  }
  getName(): string {
    return 'MANDIRI'
  }
}
