import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
      nowpayments: process.env.NOWPAYMENTS_API_KEY ? 'configured' : 'not_configured',
    },
  }

  // Check database connection
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

    if (url && key) {
      const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } } })
      const { error } = await admin.from('clips').select('id').limit(1)

      if (error) {
        health.services.database = 'error'
        health.status = 'degraded'
      } else {
        health.services.database = 'ok'
      }
    } else {
      health.services.database = 'not_configured'
      health.status = 'degraded'
    }
  } catch (error) {
    health.services.database = 'error'
    health.status = 'degraded'
  }

  const statusCode = health.status === 'ok' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
