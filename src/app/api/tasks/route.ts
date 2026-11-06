// /api/tasks  — list & create tasks for the current user
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const q = searchParams.get('q')

  const where: Record<string, unknown> = {
    OR: [
      { createdById: user.id },
      { assigneeId: user.id },
    ],
  }
  if (status) where.status = status
  if (priority) where.priority = priority
  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      },
    ]
  }

  const tasks = await db.task.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 422 }
    )
  }
  const { title, description, status, priority, dueDate, assigneeId, tags } = parsed.data

  const task = await db.task.create({
    data: {
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId || null,
      createdById: user.id,
      tags: JSON.stringify(tags || []),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  await db.activity.create({
    data: {
      type: 'created',
      taskId: task.id,
      userId: user.id,
      metadata: JSON.stringify({ title }),
    },
  })

  return NextResponse.json({ task }, { status: 201 })
}
