import { SeatState } from './SeatState'

export class ConfirmedState implements SeatState {
  getStatus(): 'CONFIRMED' {
    return 'CONFIRMED'
  }
}
