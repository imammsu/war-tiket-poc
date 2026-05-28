import { SeatState } from './SeatState'

export class AvailableState implements SeatState {
  getStatus(): 'AVAILABLE' {
    return 'AVAILABLE'
  }
}
