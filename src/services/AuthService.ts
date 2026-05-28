export class AuthService {
  async validateUser(userId: string) {
    console.log(`[AUTH-SERVICE] Validating user ${userId}...`)
    return true
  }
}

export const authService = new AuthService()
