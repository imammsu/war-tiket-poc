import { PaymentStrategy } from './PaymentStrategy'

export class BCAStrategy implements PaymentStrategy {
  async pay(amount: number): Promise<boolean> {
    console.log(`[PAYMENT] Memproses pembayaran BCA sebesar Rp${amount}...`)
    return true
  }
  getName(): string {
    return 'BCA'
  }
}
