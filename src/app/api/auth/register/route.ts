// /api/auth/register
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 422 }
      )
    }
    const { email, name, password } = parsed.data

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashed = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashed,
        role: 'user',
      },
      select: { id: true, email: true, name: true, role: true },
    })

    await createSession(user.id)

    return NextResponse.json(
      { success: true, user, message: 'Account created' },
      { status: 201 }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
