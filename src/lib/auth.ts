// src/lib/auth.ts
// Stateless JWT-based auth using HTTP-only cookies.
// No server-side session store → survives hot-reloads & is horizontally scalable.
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'taskflow_session'
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

const SECRET = process.env.AUTH_SECRET || 'arrowstack-taskflow-dev-secret-7346'

export async function hashPassword(p: string): Promise<string> {
  return bcrypt.hash(p, 10)
}

export async function comparePassword(p: string, hash: string): Promise<boolean> {
  return bcrypt.compare(p, hash)
}

export async function createSession(userId: string): Promise<void> {
  const token = jwt.sign({ sub: userId }, SECRET, { expiresIn: '7d' })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL / 1000,
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const payload = jwt.verify(token, SECRET) as { sub: string }
    if (!payload?.sub) return null

    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    })
    return user
  } catch {
    return null
  }
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}
