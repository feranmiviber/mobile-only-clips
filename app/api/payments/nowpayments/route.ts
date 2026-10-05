import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAccessCode } from '@/lib/access-code'
import { paymentSchema } from '@/lib/validation'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { handleCors, setCorsHeaders } from '@/lib/cors'

function getAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function OPTIONS(request: Request) {
  return handleCors(request)
}

export async function POST(request: Request) {
  // Handle CORS preflight
  const corsOrigin = request.headers.get('origin')

  // Rate limiting
  const identifier = getRateLimitIdentifier(request)
  const rateLimitResult = rateLimit(identifier, 5, 60000) // 5 requests per minute for payments

  if (!rateLimitResult.success) {
    const response = NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    )
    return setCorsHeaders(response, corsOrigin)
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Supabase server access is not configured yet.' }, { status: 503 })

  const body = await request.json().catch(() => null)

  // Validate with Zod
  const validationResult = paymentSchema.safeParse({
    clipId: body?.clipId,
    buyerEmail: body?.buyerEmail,
    deviceId: body?.deviceId,
  })

  if (!validationResult.success) {
    const response = NextResponse.json(
      { error: validationResult.error.errors[0]?.message || 'Invalid input' },
      { status: 400 }
    )
    return setCorsHeaders(response, corsOrigin)
  }

  const { clipId, buyerEmail, deviceId } = validationResult.data

  if (!process.env.NOWPAYMENTS_API_KEY) {
    const response = NextResponse.json({ error: 'NowPayments is not configured yet.' }, { status: 503 })
    return setCorsHeaders(response, corsOrigin)
  }

  const { data: clip, error: clipError } = await admin.from('clips').select('id,creator_id,price_cents,currency,title').eq('id', clipId).eq('status', 'active').single()
  if (clipError || !clip) {
    const response = NextResponse.json({ error: 'Clip not found.' }, { status: 404 })
    return setCorsHeaders(response, corsOrigin)
  }

  const platformFeeCents = Math.round(clip.price_cents * 0.3)
  const creatorAmountCents = clip.price_cents - platformFeeCents
  const accessCode = generateAccessCode()

  const urlOrigin = new URL(request.url).origin
  const { data: purchase, error: purchaseError } = await admin.from('purchases').insert({
    clip_id: clip.id,
    creator_id: clip.creator_id,
    buyer_email: buyerEmail,
    amount_cents: clip.price_cents,
    platform_fee_cents: platformFeeCents,
    creator_amount_cents: creatorAmountCents,
    currency: clip.currency,
    provider: 'nowpayments',
    device_id: deviceId,
    access_code: accessCode,
  }).select('id').single()

  if (purchaseError || !purchase) {
    logger.logDbError('purchase_creation', purchaseError, { clipId, buyerEmail, deviceId })
    const response = NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 })
    return setCorsHeaders(response, corsOrigin)
  }

  const fetchResponse = await fetch('https://api.nowpayments.io/v1/payment', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: clip.price_cents / 100,
      price_currency: clip.currency,
      pay_currency: 'btc',
      order_id: purchase.id,
      order_description: clip.title,
      ipn_callback_url: `${urlOrigin}/api/payments/nowpayments/webhook`,
    }),
  })

  const payment = await fetchResponse.json().catch(() => null)
  if (!fetchResponse.ok || !payment?.payment_id) {
    logger.logApiError('nowpayments_create_payment', payment, { clipId, buyerEmail })
    const response = NextResponse.json({ error: 'NowPayments could not create checkout.' }, { status: 502 })
    return setCorsHeaders(response, corsOrigin)
  }

  await admin.from('purchases').update({ provider_payment_id: String(payment.payment_id) }).eq('id', purchase.id)

  const response = NextResponse.json({
    purchaseId: purchase.id,
    paymentId: payment.payment_id,
    payAddress: payment.pay_address,
    payAmount: payment.pay_amount,
    payCurrency: payment.pay_currency,
    accessCode: accessCode,
  })
  return setCorsHeaders(response, corsOrigin)
}
