export interface SeatState {
  getStatus(): 'AVAILABLE' | 'RESERVED' | 'CONFIRMED'
}
