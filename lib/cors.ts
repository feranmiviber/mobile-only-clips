/**
 * CORS middleware for API routes
 */

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['*']

export function setCorsHeaders(response: Response, origin?: string): Response {
  const headers = new Headers(response.headers)

  // Set Access-Control-Allow-Origin
  if (ALLOWED_ORIGINS.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*')
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
  }

  // Set other CORS headers
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  headers.set('Access-Control-Max-Age', '86400') // 24 hours

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function handleCors(request: Request): Response {
  const origin = request.headers.get('origin')

  const headers = new Headers()

  // Set Access-Control-Allow-Origin
  if (ALLOWED_ORIGINS.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*')
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
  }

  // Set other CORS headers
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  headers.set('Access-Control-Max-Age', '86400') // 24 hours

  return new Response(null, { status: 204, headers })
}

export function isOriginAllowed(origin?: string | null): boolean {
  if (!origin) return true
  if (ALLOWED_ORIGINS.includes('*')) return true
  return ALLOWED_ORIGINS.includes(origin)
}
