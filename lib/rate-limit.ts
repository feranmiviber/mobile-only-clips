/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute default
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Clean up expired entries
  if (entry && entry.resetTime < now) {
    rateLimitStore.delete(identifier)
  }

  const currentEntry = rateLimitStore.get(identifier) || {
    count: 0,
    resetTime: now + windowMs,
  }

  if (currentEntry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: currentEntry.resetTime,
    }
  }

  currentEntry.count += 1
  rateLimitStore.set(identifier, currentEntry)

  return {
    success: true,
    remaining: limit - currentEntry.count,
    resetTime: currentEntry.resetTime,
  }
}

export function getRateLimitIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to a hash of the request
  return 'unknown'
}

// Clean up old entries periodically (call this from a cron job or similar)
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}
