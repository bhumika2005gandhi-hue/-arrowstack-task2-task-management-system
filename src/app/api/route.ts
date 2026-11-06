// Root API health-check
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'TaskFlow API',
    ref: 'AS-2026-7346',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      auth: '/api/auth/*',
      tasks: '/api/tasks',
      dashboard: '/api/dashboard',
      users: '/api/users',
      seed: '/api/seed',
    },
    timestamp: new Date().toISOString(),
  })
}
