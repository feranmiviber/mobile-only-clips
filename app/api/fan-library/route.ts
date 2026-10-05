import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAccessCode, formatAccessCode } from '@/lib/access-code'
import { fanLibrarySchema } from '@/lib/validation'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { handleCors, setCorsHeaders } from '@/lib/cors'

export async function OPTIONS(request: Request) {
  return handleCors(request)
}

export async function POST(request: Request) {
  // Handle CORS preflight
  const origin = request.headers.get('origin')

  // Rate limiting
  const identifier = getRateLimitIdentifier(request)
  const rateLimitResult = rateLimit(identifier, 10, 60000) // 10 requests per minute

  if (!rateLimitResult.success) {
    const response = NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    )
    return setCorsHeaders(response, origin)
  }

  const body = await request.json().catch(() => null)

  // Validate with Zod
  const validationResult = fanLibrarySchema.safeParse({
    email: body?.email,
    accessCode: body?.accessCode,
    deviceId: body?.deviceId,
  })

  if (!validationResult.success) {
    const response = NextResponse.json(
      { error: validationResult.error.errors[0]?.message || 'Invalid input' },
      { status: 400 }
    )
    return setCorsHeaders(response, origin)
  }

  const { email, accessCode, deviceId } = validationResult.data

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    const response = NextResponse.json({ error: 'Backend is not configured.' }, { status: 503 })
    return setCorsHeaders(response, origin)
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Query with device binding validation
  const { data, error } = await admin
    .from('fan_access')
    .select('id,clip_id,creator_id,unlocked_at,expires_at,device_id,access_code,clips(title,thumbnail_path,price_cents),profiles(display_name)')
    .eq('buyer_email', email)
    .eq('access_code', accessCode)
    .eq('device_id', deviceId)
    .gt('expires_at', new Date().toISOString())
    .order('unlocked_at', { ascending: false })

  if (error) {
    logger.logDbError('fan_library_query', error, { email, deviceId })
    const response = NextResponse.json({ error: 'Could not load your library.' }, { status: 500 })
    return setCorsHeaders(response, origin)
  }

  // If no items found, check if email exists but device/code mismatch
  if (!data || data.length === 0) {
    const { data: emailCheck } = await admin
      .from('fan_access')
      .select('id')
      .eq('buyer_email', email)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (emailCheck && emailCheck.length > 0) {
      const response = NextResponse.json({ error: 'Access code or device does not match. This code is bound to a different device.' }, { status: 403 })
      return setCorsHeaders(response, origin)
    }

    const response = NextResponse.json({ error: 'No active unlocks found for this email.' }, { status: 404 })
    return setCorsHeaders(response, origin)
  }

  const response = NextResponse.json({ items: data, expiresInDays: 30 })
  return setCorsHeaders(response, origin)
}

export async function GET() {
  return NextResponse.json({ error: 'Enter the email used at checkout.' }, { status: 400 })
}
