// /api/tasks/[id] — get, update, delete a single task
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { id } = await params
  const task = await db.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      comments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      activity: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  if (task.createdById !== user.id && task.assigneeId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ task })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { id } = await params
  const existing = await db.task.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  if (existing.createdById !== user.id && existing.assigneeId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 422 }
    )
  }
  const data: Record<string, unknown> = {}
  const { title, description, status, priority, dueDate, assigneeId, tags } = parsed.data
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (status !== undefined) data.status = status
  if (priority !== undefined) data.priority = priority
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
  if (assigneeId !== undefined) data.assigneeId = assigneeId
  if (tags !== undefined) data.tags = JSON.stringify(tags)

  const updated = await db.task.update({
    where: { id },
    data,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  if (status !== undefined && status !== existing.status) {
    await db.activity.create({
      data: {
        type: 'status_changed',
        taskId: id,
        userId: user.id,
        metadata: JSON.stringify({ from: existing.status, to: status }),
      },
    })
  } else {
    await db.activity.create({
      data: {
        type: 'updated',
        taskId: id,
        userId: user.id,
        metadata: JSON.stringify({}),
      },
    })
  }

  return NextResponse.json({ task: updated })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { id } = await params
  const task = await db.task.findUnique({ where: { id } })
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  if (task.createdById !== user.id) {
    return NextResponse.json(
      { error: 'Only the creator can delete this task' },
      { status: 403 }
    )
  }
  await db.task.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Task deleted' })
}
