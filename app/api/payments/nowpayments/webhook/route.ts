import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

function getAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function isIpAllowed(ip: string | null): boolean {
  if (!ip) return false

  // If no whitelist is configured, allow all (for development)
  const whitelist = process.env.NOWPAYMENTS_IP_WHITELIST
  if (!whitelist) {
    logger.warn('No IP whitelist configured for NowPayments webhooks', { ip })
    return true
  }

  const allowedIps = whitelist.split(',').map((s) => s.trim())
  return allowedIps.includes(ip)
}

function getClientIp(request: Request): string | null {
  // Check various headers for the real IP
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

  return null
}

export async function POST(request: Request) {
  // IP whitelist check
  const clientIp = getClientIp(request)
  if (!isIpAllowed(clientIp)) {
    logger.warn('Webhook request from unauthorized IP', { ip: clientIp })
    return NextResponse.json({ error: 'Unauthorized IP.' }, { status: 403 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Supabase server access is not configured yet.' }, { status: 503 })

  const raw = await request.text()
  const signature = request.headers.get('x-nowpayments-sig')
  if (!signature || !process.env.NOWPAYMENTS_IPN_SECRET) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })
  }

  const expected = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET).update(raw).digest('hex')
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  const event = JSON.parse(raw)
  const paymentId = String(event.payment_id ?? '')
  const status = String(event.payment_status ?? '')
  if (!paymentId) return NextResponse.json({ received: true })

  const mapped = ['finished', 'confirmed'].includes(status) ? 'confirmed' : ['failed', 'expired'].includes(status) ? 'failed' : 'pending'

  // Idempotency check: Check if this event was already processed
  const providerEventId = `${paymentId}:${status}:${event.updated_at ?? event.created_at ?? ''}`
  const { data: existingEvent } = await admin
    .from('payment_events')
    .select('id')
    .eq('provider_event_id', providerEventId)
    .single()

  if (existingEvent) {
    logger.info('Webhook event already processed', { providerEventId, paymentId, status })
    // Event already processed, return success
    return NextResponse.json({ received: true, alreadyProcessed: true })
  }

  const { data: purchase } = await admin.from('purchases').select('id,clip_id,creator_id,buyer_email,device_id,access_code,amount_cents').eq('provider_payment_id', paymentId).single()

  await admin.from('payment_events').upsert({
    purchase_id: purchase?.id ?? null,
    provider: 'nowpayments',
    provider_event_id: providerEventId,
    event_type: status,
    payload: event,
  }, { onConflict: 'provider_event_id' })

  if (purchase) {
    await admin.from('purchases').update({
      status: mapped,
      confirmed_at: mapped === 'confirmed' ? new Date().toISOString() : null,
    }).eq('id', purchase.id)

    if (mapped === 'confirmed') {
      // Create fan_access record with device binding
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30-day expiry

      await admin.from('fan_access').upsert({
        clip_id: purchase.clip_id,
        creator_id: purchase.creator_id,
        buyer_email: purchase.buyer_email,
        device_id: purchase.device_id,
        access_code: purchase.access_code,
        unlocked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        device_bound_at: new Date().toISOString(),
      }, { onConflict: 'clip_id,buyer_email,device_id' })

      // Create payout record
      const { data: purchaseDetails } = await admin.from('purchases').select('id,creator_id,creator_amount_cents,currency').eq('id', purchase.id).single()
      if (purchaseDetails) {
        await admin.from('payouts').upsert({
          purchase_id: purchaseDetails.id,
          creator_id: purchaseDetails.creator_id,
          amount_cents: purchaseDetails.creator_amount_cents,
          currency: purchaseDetails.currency,
          provider: 'nowpayments',
          status: 'pending',
        }, { onConflict: 'purchase_id' })
      }
    }
  }

  return NextResponse.json({ received: true })
}
