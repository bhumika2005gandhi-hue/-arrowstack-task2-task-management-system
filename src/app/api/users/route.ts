// /api/users — list users for assignment dropdown
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    take: 100,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ users })
}
