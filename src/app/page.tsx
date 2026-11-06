'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Clock,
  ListTodo,
  AlertTriangle,
  Plus,
  Search,
  LogOut,
  LayoutDashboard,
  CalendarDays,
  User as UserIcon,
  TrendingUp,
  Filter,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
type User = { id: string; email: string; name: string | null; role: string }
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  tags: string
  createdAt: string
  assignee: { id: string; name: string | null; email: string } | null
  createdBy: { id: string; name: string | null; email: string }
}
type Dashboard = {
  counts: { total: number; todo: number; inProgress: number; review: number; done: number }
  priorities: { urgent: number; high: number; medium: number; low: number }
  overdue: number
  completionRate: number
  trend: { date: string; created: number; completed: number }[]
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  done: 'Done',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
}

const STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  review: 'bg-amber-500',
  done: 'bg-emerald-500',
}

// ────────────────────────────────────────────────────────────────
// Auth + API helpers
// ────────────────────────────────────────────────────────────────
async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed')
  }
  return data
}

function parseTags(t: string): string[] {
  try {
    const arr = JSON.parse(t)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ email: '', name: '', password: '' })
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
    tags: '',
  })
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [comment, setComment] = useState('')

  const loadInitial = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      if (meRes.ok) {
        const meData = await meRes.json()
        setUser(meData.user)
        await Promise.all([loadTasks(), loadDashboard()])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  async function loadTasks() {
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterPriority !== 'all') params.set('priority', filterPriority)
      if (search) params.set('q', search)
      const data = await api(`/api/tasks?${params.toString()}`)
      setTasks(data.tasks)
    } catch (err) {
      toast.error('Failed to load tasks', { description: (err as Error).message })
    }
  }

  async function loadDashboard() {
    try {
      const data = await api('/api/dashboard')
      setDashboard(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (user) loadTasks()
  }, [filterStatus, filterPriority, search, user])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authForm
      await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      toast.success(authMode === 'login' ? 'Welcome back!' : 'Account created!')
      await loadInitial()
      setAuthForm({ email: '', name: '', password: '' })
    } catch (err) {
      toast.error('Authentication failed', { description: (err as Error).message })
    }
  }

  async function handleLogout() {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setTasks([])
    setDashboard(null)
    toast.success('Logged out')
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    try {
      const tags = newTask.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          dueDate: newTask.dueDate || undefined,
          tags,
        }),
      })
      toast.success('Task created')
      setTaskDialogOpen(false)
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', tags: '' })
      await Promise.all([loadTasks(), loadDashboard()])
    } catch (err) {
      toast.error('Failed to create task', { description: (err as Error).message })
    }
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return
    try {
      await api(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      toast.success(`Marked as ${STATUS_LABELS[status]}`)
      // Optimistically update the selected task dialog
      setSelectedTask((prev) => (prev && prev.id === task.id ? { ...prev, status } : prev))
      await Promise.all([loadTasks(), loadDashboard()])
    } catch (err) {
      toast.error('Failed to update', { description: (err as Error).message })
    }
  }

  async function deleteTask(task: Task) {
    try {
      await api(`/api/tasks/${task.id}`, { method: 'DELETE' })
      toast.success('Task deleted')
      setSelectedTask(null)
      await Promise.all([loadTasks(), loadDashboard()])
    } catch (err) {
      toast.error('Failed to delete', { description: (err as Error).message })
    }
  }

  async function submitComment() {
    if (!selectedTask || !comment.trim()) return
    try {
      await api(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: comment }),
      })
      toast.success('Comment added')
      setComment('')
      // Refresh selected task
      const data = await api(`/api/tasks/${selectedTask.id}`)
      setSelectedTask(data.task)
    } catch (err) {
      toast.error('Failed to add comment', { description: (err as Error).message })
    }
  }

  async function seedDemo() {
    try {
      await api('/api/seed', { method: 'POST' })
      toast.success('Demo data seeded — log in with demo@arrowstack.org / Demo@12345')
    } catch (err) {
      toast.error('Seed failed', { description: (err as Error).message })
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          <p className="text-slate-500 text-sm">Loading TaskFlow…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        form={authForm}
        setForm={setAuthForm}
        onSubmit={handleAuth}
        onSeed={seedDemo}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Dashboard stats */}
        {dashboard && <DashboardStats dashboard={dashboard} />}

        {/* Toolbar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">My Tasks</h2>
            <p className="text-sm text-slate-500">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} ·{' '}
              {dashboard?.counts.done ?? 0} completed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tasks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-44 sm:w-56"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 sm:w-40">
                <Filter className="h-4 w-4 mr-1 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32 sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-1" /> New Task
                </Button>
              </DialogTrigger>
              <NewTaskDialog
                newTask={newTask}
                setNewTask={setNewTask}
                onSubmit={handleCreateTask}
                onCancel={() => setTaskDialogOpen(false)}
              />
            </Dialog>
          </div>
        </div>

        {/* Tasks board */}
        <div className="mt-6">
          {tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <ListTodo className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No tasks match your filters.</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setFilterStatus('all')
                    setFilterPriority('all')
                    setSearch('')
                  }}
                  className="mt-2 text-emerald-600"
                >
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                  onStatusChange={(s) => updateTaskStatus(task, s)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Task detail drawer */}
      <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedTask && (
            <TaskDetail
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onStatusChange={(s) => {
                updateTaskStatus(selectedTask, s)
              }}
              onDelete={() => deleteTask(selectedTask)}
              comment={comment}
              setComment={setComment}
              onSubmitComment={submitComment}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Header
// ────────────────────────────────────────────────────────────────
function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  const initials = (user.name || user.email)[0].toUpperCase()
  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">TaskFlow</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">
              Arrowstack · AS-2026-7346
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user.name || user.email}</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5 capitalize">
              {user.role}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

// ────────────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-auto border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-500">
        TaskFlow · Built for Arrowstack Batch 2026 Full Stack Development Internship ·{' '}
        Ref <span className="font-mono">AS-2026-7346</span> · © Bhumika Gandhi
      </div>
    </footer>
  )
}

// ────────────────────────────────────────────────────────────────
// Dashboard Stats
// ────────────────────────────────────────────────────────────────
function DashboardStats({ dashboard }: { dashboard: Dashboard }) {
  const { counts, priorities, overdue, completionRate, trend } = dashboard
  const maxCreated = Math.max(1, ...trend.map((t) => t.created))

  const stats = [
    {
      label: 'Total Tasks',
      value: counts.total,
      icon: ListTodo,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      label: 'In Progress',
      value: counts.inProgress,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Completed',
      value: counts.done,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      label: 'Overdue',
      value: overdue,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
    },
  ]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <LayoutDashboard className="h-5 w-5 text-emerald-600" />
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight">{s.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Completion rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{completionRate}%</span>
              <span className="text-xs text-slate-500">
                ({counts.done} of {counts.total})
              </span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </CardContent>
        </Card>

        {/* Priority breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Open Tasks by Priority
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[
              ['Urgent', priorities.urgent, 'bg-rose-500'],
              ['High', priorities.high, 'bg-amber-500'],
              ['Medium', priorities.medium, 'bg-blue-500'],
              ['Low', priorities.low, 'bg-slate-400'],
            ].map(([label, val, color]) => (
              <div key={label as string} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-slate-600">{label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={color as string}
                    style={{
                      width: `${(Number(val) / Math.max(1, counts.total - counts.done)) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-6 text-right font-medium">{val as number}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 7-day trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-16 gap-1.5">
              {trend.map((t) => (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-emerald-500 rounded-t-sm min-h-[2px]"
                    style={{ height: `${(t.created / maxCreated) * 100}%` }}
                    title={`${t.created} created`}
                  />
                  <span className="text-[9px] text-slate-400">
                    {new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 text-center">Tasks created per day</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────
// Task Card
// ────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  onClick,
  onStatusChange,
}: {
  task: Task
  onClick: () => void
  onStatusChange: (s: TaskStatus) => void
}) {
  const tags = parseTags(task.tags)
  const days = daysUntil(task.dueDate)
  const isOverdue = task.dueDate && days !== null && days < 0 && task.status !== 'done'

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-slate-200"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[task.status]}`} />
            <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </Badge>
          </div>
          <Select
            value={task.status}
            onValueChange={(v) => {
              onStatusChange(v as TaskStatus)
            }}
          >
            <SelectTrigger className="h-6 w-[110px] text-[10px]" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <h3 className="font-medium text-sm leading-snug mb-1 line-clamp-2">{task.title}</h3>
        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] py-0 px-1.5 h-4">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
          {task.dueDate ? (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-medium' : ''}`}>
              <CalendarDays className="h-3 w-3" />
              {formatDate(task.dueDate)}
              {isOverdue && ' · overdue'}
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            {task.assignee?.name || task.createdBy.name || 'Unassigned'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────
// Task Detail (in dialog)
// ────────────────────────────────────────────────────────────────
function TaskDetail({
  task,
  onClose,
  onStatusChange,
  onDelete,
  comment,
  setComment,
  onSubmitComment,
}: {
  task: Task
  onClose: () => void
  onStatusChange: (s: TaskStatus) => void
  onDelete: () => void
  comment: string
  setComment: (s: string) => void
  onSubmitComment: () => void
}) {
  const tags = parseTags(task.tags)
  const days = daysUntil(task.dueDate)
  return (
    <div className="space-y-4">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-2">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[task.status]}`} />
          <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </Badge>
          <span className="text-xs text-slate-500 ml-auto">Created {formatDate(task.createdAt)}</span>
        </div>
        <DialogTitle className="text-lg">{task.title}</DialogTitle>
        <DialogDescription>
          {task.description || 'No description provided.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <Label className="text-slate-500">Status</Label>
          <Select value={task.status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-500">Due Date</Label>
          <div className="h-8 mt-1 px-3 flex items-center border rounded-md bg-slate-50">
            {task.dueDate ? (
              <span className={days !== null && days < 0 && task.status !== 'done' ? 'text-rose-600 font-medium' : ''}>
                {formatDate(task.dueDate)}
                {days !== null && (
                  <span className="text-slate-400 ml-1">
                    ({days > 0 ? `${days}d left` : days === 0 ? 'today' : `${-days}d overdue`})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <Label className="text-xs text-slate-500">Tags</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                #{t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div>
        <Label className="text-xs text-slate-500">Add a comment</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write an update…"
          className="mt-1 min-h-[60px]"
        />
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={onSubmitComment} disabled={!comment.trim()}>
            Post Comment
          </Button>
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// New Task Dialog (inline)
// ────────────────────────────────────────────────────────────────
function NewTaskDialog({
  newTask,
  setNewTask,
  onSubmit,
  onCancel,
}: {
  newTask: { title: string; description: string; priority: TaskPriority; dueDate: string; tags: string }
  setNewTask: (n: typeof newTask) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create a new task</DialogTitle>
        <DialogDescription>Add a task to your dashboard. All fields except title are optional.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="e.g. Implement /api/auth/refresh endpoint"
            required
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Brief notes on what needs doing…"
            className="min-h-[80px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={newTask.priority}
              onValueChange={(v) => setNewTask({ ...newTask, priority: v as TaskPriority })}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={newTask.tags}
            onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
            placeholder="backend, jwt, security"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
            Create Task
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

// ────────────────────────────────────────────────────────────────
// Auth Screen
// ────────────────────────────────────────────────────────────────
function AuthScreen({
  mode,
  setMode,
  form,
  setForm,
  onSubmit,
  onSeed,
}: {
  mode: 'login' | 'register'
  setMode: (m: 'login' | 'register') => void
  form: { email: string; name: string; password: string }
  setForm: (f: typeof form) => void
  onSubmit: (e: React.FormEvent) => void
  onSeed: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-3">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
          <p className="text-sm text-slate-500 mt-1">
            Arrowstack Batch 2026 · Task 2 · Full Stack Task Management
          </p>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Bhumika Gandhi"
                    required={mode === 'register'}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={mode === 'register' ? 'Min 8 characters' : '••••••••'}
                  required
                />
                {mode === 'register' && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Min 8 chars · mix of letters & digits recommended
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Sparkles className="h-4 w-4 mr-1" />
                {mode === 'login' ? 'Log In' : 'Create Account'}
              </Button>
            </form>

            <Separator className="my-4" />

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onSeed}
            >
              <Sparkles className="h-4 w-4 mr-1 text-emerald-600" />
              Seed Demo Data
            </Button>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Demo login: <span className="font-mono">demo@arrowstack.org</span> /{' '}
              <span className="font-mono">Demo@12345</span>
            </p>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-[10px] text-slate-400">
          Ref: AS-2026-7346 · Built by Bhumika Gandhi · Arrowstack Batch 2026
        </div>
      </div>
    </div>
  )
}
