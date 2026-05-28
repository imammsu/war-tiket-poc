import { redisSimulator } from '../infrastructure/RedisSimulator'

/**
 * [SERVICE] ScheduleService
 * Menggunakan Redis untuk Caching data jadwal.
 */
export class ScheduleService {
  async getSchedules() {
    // [PATTERN] REDIS CACHING: Cek cache sebelum ambil ke "DB"
    const cached = redisSimulator.get('schedules')
    if (cached) {
      console.log(`[SCHEDULE-SERVICE] Returning schedules from CACHE`)
      return cached
    }

    console.log(`[SCHEDULE-SERVICE] Fetching schedules from DB (Simulated delay)`)
    const schedules = [
      { id: 'SCH-001', train: 'Argo Bromo', time: '08:00' },
      { id: 'SCH-002', train: 'Taksaka', time: '09:00' }
    ]
    
    // [PATTERN] REDIS CACHING: Simpan hasil fetch ke cache
    redisSimulator.set('schedules', schedules, 60000) // cache 1 menit
    return schedules
  }
}

export const scheduleService = new ScheduleService()
