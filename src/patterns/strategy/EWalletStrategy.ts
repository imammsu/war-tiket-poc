import { PaymentStrategy } from './PaymentStrategy'

export class EWalletStrategy implements PaymentStrategy {
  async pay(amount: number): Promise<boolean> {
    console.log(`[PAYMENT] Memproses pembayaran E-Wallet sebesar Rp${amount}...`)
    return true
  }
  getName(): string {
    return 'E-WALLET'
  }
}
