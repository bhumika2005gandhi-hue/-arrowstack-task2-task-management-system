// /api/seed — quickly seed a demo account + sample tasks (idempotent)
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const SAMPLE_TASKS = [
  {
    title: 'Design JWT auth microservice schema',
    description:
      'Define user, refresh-token, and audit tables. Plan role hierarchy (user/moderator/admin).',
    status: 'done' as const,
    priority: 'high' as const,
    tags: ['design', 'backend'],
  },
  {
    title: 'Implement register + login endpoints',
    description:
      'POST /api/auth/register and /api/auth/login returning access + refresh tokens.',
    status: 'done' as const,
    priority: 'urgent' as const,
    tags: ['backend', 'jwt'],
  },
  {
    title: 'Build TaskFlow dashboard UI',
    description:
      'Show stats: total, by-status, by-priority, overdue, completion rate, 7-day trend chart.',
    status: 'in_progress' as const,
    priority: 'high' as const,
    tags: ['frontend', 'ui'],
  },
  {
    title: 'Integrate Prisma + SQLite persistence',
    description:
      'Replace in-memory store with Prisma Client. Define User / Task / Comment / Activity models.',
    status: 'review' as const,
    priority: 'medium' as const,
    tags: ['backend', 'db'],
  },
  {
    title: 'Write LinkedIn post for Task 1 (JWT microservice)',
    description: 'Tag @Arrowstack. Show architecture diagram + sample curl command.',
    status: 'todo' as const,
    priority: 'medium' as const,
    tags: ['content'],
    dueDateOffset: 3,
  },
  {
    title: 'Write LinkedIn post for Task 2 (TaskFlow)',
    description: 'Demo GIF / screenshots. Tag @Arrowstack.',
    status: 'todo' as const,
    priority: 'low' as const,
    tags: ['content'],
    dueDateOffset: 5,
  },
  {
    title: 'Push both repos to GitHub with READMEs',
    description: 'Public repos, clean commit history, MIT license.',
    status: 'todo' as const,
    priority: 'urgent' as const,
    tags: ['devops'],
  },
  {
    title: 'Submit on Arrowstack intern portal',
    description:
      'Paste GitHub URLs + LinkedIn post URLs in the submission form before grace period ends.',
    status: 'todo' as const,
    priority: 'urgent' as const,
    tags: ['submission'],
    dueDateOffset: 2,
  },
]

export async function POST() {
  // Ensure demo user exists
  let user = await db.user.findUnique({ where: { email: 'demo@arrowstack.org' } })
  if (!user) {
    const pwd = await hashPassword('Demo@12345')
    user = await db.user.create({
      data: {
        email: 'demo@arrowstack.org',
        name: 'Bhumika Gandhi',
        password: pwd,
        role: 'admin',
      },
    })
  }

  // Always ensure sample tasks exist (skip if same title already present)
  let created = 0
  for (const t of SAMPLE_TASKS) {
    const existing = await db.task.findFirst({ where: { title: t.title, createdById: user.id } })
    if (existing) continue
    const dueDate = t.dueDateOffset
      ? new Date(Date.now() + t.dueDateOffset * 86400 * 1000)
      : null
    await db.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        tags: JSON.stringify(t.tags),
        dueDate,
        createdById: user.id,
        assigneeId: user.id,
      },
    })
    created++
  }

  return NextResponse.json({
    success: true,
    message: `Demo data ready. ${created} new task(s) added.`,
    credentials: { email: 'demo@arrowstack.org', password: 'Demo@12345' },
    userId: user.id,
  })
}
