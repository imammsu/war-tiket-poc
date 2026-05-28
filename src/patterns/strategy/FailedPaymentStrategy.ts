import { PaymentStrategy } from './PaymentStrategy'

export class FailedPaymentStrategy implements PaymentStrategy {
  constructor(private readonly strategy: PaymentStrategy) {}

  async pay(amount: number): Promise<boolean> {
    console.log(`[PAYMENT] Simulasi gagal pembayaran via ${this.strategy.getName()} sebesar Rp${amount}...`)
    return false
  }

  getName(): string {
    return `${this.strategy.getName()} (SIMULASI GAGAL)`
  }
}
