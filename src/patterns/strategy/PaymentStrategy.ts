export interface PaymentStrategy {
  pay(amount: number): Promise<boolean>
  getName(): string
}
