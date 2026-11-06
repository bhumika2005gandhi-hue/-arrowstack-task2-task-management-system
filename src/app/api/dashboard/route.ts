// /api/dashboard — aggregate stats for the dashboard view
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const where = {
    OR: [{ createdById: user.id }, { assigneeId: user.id }],
  }

  const total = await db.task.count({ where })
  const todo = await db.task.count({ where: { ...where, status: 'todo' } })
  const inProgress = await db.task.count({ where: { ...where, status: 'in_progress' } })
  const review = await db.task.count({ where: { ...where, status: 'review' } })
  const done = await db.task.count({ where: { ...where, status: 'done' } })

  const urgent = await db.task.count({ where: { ...where, priority: 'urgent', status: { not: 'done' } } })
  const high = await db.task.count({ where: { ...where, priority: 'high', status: { not: 'done' } } })
  const medium = await db.task.count({ where: { ...where, priority: 'medium', status: { not: 'done' } } })
  const low = await db.task.count({ where: { ...where, priority: 'low', status: { not: 'done' } } })

  const overdue = await db.task.count({
    where: {
      ...where,
      dueDate: { lt: new Date() },
      status: { not: 'done' },
    },
  })

  const completionRate = total === 0 ? 0 : Math.round((done / total) * 100)

  // Last 7 days creation trend
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const recentTasks = await db.task.findMany({
    where: {
      ...where,
      createdAt: { gte: sevenDaysAgo },
    },
    select: { createdAt: true, status: true },
  })

  const trend: { date: string; created: number; completed: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const created = recentTasks.filter(
      (t) => t.createdAt >= d && t.createdAt < next
    ).length
    trend.push({
      date: d.toISOString().slice(0, 10),
      created,
      completed: 0, // we'd need activity logs to compute this precisely
    })
  }

  return NextResponse.json({
    counts: { total, todo, inProgress, review, done },
    priorities: { urgent, high, medium, low },
    overdue,
    completionRate,
    trend,
  })
}
