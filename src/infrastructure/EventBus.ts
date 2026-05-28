import { EventEmitter } from 'events'

/**
 * [INFRASTRUCTURE] Message Broker (Simulator)
 * Menggunakan EventEmitter untuk mensimulasikan RabbitMQ.
 * Digunakan sebagai tulang punggung komunikasi Choreography Saga.
 */
class EventBus extends EventEmitter {
  /**
   * [PATTERN] TOPIC EXCHANGE
   * Mengirim pesan ke berbagai subscriber berdasarkan event/topik.
   */
  public publishToTopicExchange(event: string, payload: any) {
    console.log(`[RABBITMQ] Topic Exchange — publish: ${event}`)
    this.emit(event, payload)
  }

  /**
   * [PATTERN] DEAD LETTER EXCHANGE (DLX)
   * Menangani pesan yang kadaluarsa (TTL) atau gagal diproses.
   * Dalam PoC ini, dipicu oleh Redis Keyspace Notification.
   */
  public publishToDLX(event: string, payload: any) {
    console.log(`[RABBITMQ] Dead Letter Exchange — route: ${event}`)
    this.emit(`DLX:${event}`, payload)
  }
}

export const eventBus = new EventBus()
