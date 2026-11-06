// /api/tasks/[id]/comments — add a comment
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const schema = z.object({
  content: z.string().min(1).max(2000),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { id } = await params
  const task = await db.task.findUnique({ where: { id } })
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid comment', details: parsed.error.issues }, { status: 422 })
  }

  const comment = await db.comment.create({
    data: {
      content: parsed.data.content,
      taskId: id,
      userId: user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  await db.activity.create({
    data: {
      type: 'commented',
      taskId: id,
      userId: user.id,
      metadata: JSON.stringify({ content: parsed.data.content.slice(0, 100) }),
    },
  })

  return NextResponse.json({ comment }, { status: 201 })
}
