import { PaymentStrategy } from '../strategy/PaymentStrategy'

export class PaymentGatewayProxy {
  private strategy: PaymentStrategy

  constructor(strategy: PaymentStrategy) {
    this.strategy = strategy
  }

  async processPayment(amount: number, simulateFail: boolean = false): Promise<boolean> {
    let attempts = 0
    const maxRetries = 3

    while (attempts < maxRetries) {
      try {
        attempts++
        console.log(`[PROXY] Mencoba pembayaran via ${this.strategy.getName()} (Percobaan #${attempts})`)
        
        // Simulasi delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (simulateFail && attempts < 3) {
          throw new Error('TIMEOUT_FROM_BANK')
        }

        if (simulateFail && attempts === 3) {
          console.error(`[PROXY] ❌ Pembayaran gagal setelah ${maxRetries} percobaan.`)
          return false
        }

        const result = await this.strategy.pay(amount)
        console.log(`[PROXY] ✅ Pembayaran berhasil via ${this.strategy.getName()}`)
        return result
      } catch (error: any) {
        console.warn(`[PROXY] ⚠️ Percobaan #${attempts} gagal: ${error.message}`)
        if (attempts >= maxRetries) {
          console.error(`[PROXY] ❌ Mencapai batas percobaan.`)
          return false
        }
      }
    }
    return false
  }
}
