import { eventBus } from './EventBus'

const redisCache = new Map<string, { value: any; expiredAt: number }>()
const activeTimers = new Map<string, { timer: NodeJS.Timeout; payload: any; expiredAt: number }>()

/**
 * [INFRASTRUCTURE] RedisSimulator
 * Mensimulasikan Redis untuk Caching dan Keyspace Notifications (TTL).
 */
export const redisSimulator = {
  // [PATTERN] REDIS CACHING: Simpan data ke cache
  set(key: string, value: any, ttlMs: number) {
    redisCache.set(key, {
      value,
      expiredAt: Date.now() + ttlMs
    })
  },

  // [PATTERN] REDIS CACHING: Ambil data dari cache
  get(key: string) {
    const entry = redisCache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiredAt) {
      redisCache.delete(key)
      return null
    }
    return entry.value
  },

  /**
   * [PATTERN] TIME-BASED CIRCUIT (TTL Notification)
   * Menjalankan callback (event) jika data tidak dihapus sebelum batas waktu.
   */
  setWithExpiry(key: string, payload: any, ttlMs: number) {
    console.log(`[REDIS]  ⚡ SET ${key} (TTL: ${ttlMs / 1000} detik)`)

    this.del(key)
    const expiredAt = Date.now() + ttlMs
    const timer = setTimeout(() => {
      console.log(`[REDIS]  ⏰ TTL EXPIRED: ${key}`)
      console.log(`[BOOKING] 📨 Keyspace Notification diterima`)
      // Trigger event untuk Saga Compensating Transaction
      eventBus.publishToDLX('BOOKING_EXPIRED', payload)
      activeTimers.delete(key)
    }, ttlMs)

    activeTimers.set(key, { timer, payload, expiredAt })
  },

  hasActiveExpiry(key: string) {
    const entry = activeTimers.get(key)
    return Boolean(entry && Date.now() < entry.expiredAt)
  },

  expireIfNeeded(key: string) {
    const entry = activeTimers.get(key)
    if (!entry || Date.now() < entry.expiredAt) {
      return false
    }

    clearTimeout(entry.timer)
    activeTimers.delete(key)
    console.log(`[REDIS]  ⏰ TTL EXPIRED: ${key}`)
    console.log(`[BOOKING] 📨 Keyspace Notification diterima`)
    eventBus.publishToDLX('BOOKING_EXPIRED', entry.payload)
    return true
  },

  getRemainingTtl(key: string) {
    const entry = activeTimers.get(key)
    if (!entry) return 0
    return Math.max(0, entry.expiredAt - Date.now())
  },

  del(key: string) {
    const entry = activeTimers.get(key)
    if (entry) {
      clearTimeout(entry.timer)
      activeTimers.delete(key)
      console.log(`[REDIS]  🗑️  DEL ${key} (TTL dibatalkan)`)
      return true
    }
    return false
  }
}
