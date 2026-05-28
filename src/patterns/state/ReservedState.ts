import { SeatState } from './SeatState'

export class ReservedState implements SeatState {
  getStatus(): 'RESERVED' {
    return 'RESERVED'
  }
}
