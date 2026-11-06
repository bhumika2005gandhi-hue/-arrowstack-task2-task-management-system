# Task 2 · TaskFlow — Full Stack Task Management System

> **Arrowstack Technologies — Virtual Internship, Batch 2026**
> Domain: Full Stack Development (Technical Track · Advanced)
> Ref ID: `AS-2026-7346` · Intern: **Bhumika Gandhi**
> Tenure: Aug 22, 2026 → Sep 22, 2026

A production-grade, full-stack task management application built with **Next.js 16 (App Router), React 19, TypeScript, Prisma ORM (SQLite), Tailwind CSS 4, and shadcn/ui**. Features JWT-based authentication, full CRUD task operations, dashboard analytics, and a responsive, mobile-first UI.

> **Live Preview:** Running locally — see "Quick Start" below.

---

## ✨ Features

### Authentication & Authorization
- ✅ User registration with bcrypt password hashing
- ✅ Login / logout with stateless JWT cookies (HTTP-only, 7-day expiry)
- ✅ Password strength validation (≥ 8 chars)
- ✅ Protected routes — every API validates the session
- ✅ Self-service profile lookup (`/api/auth/me`)

### Task Management
- ✅ Create tasks with title, description, priority, due date, tags
- ✅ Update task status (To Do → In Progress → In Review → Done)
- ✅ Inline status change from card or detail dialog
- ✅ Delete tasks (creator only)
- ✅ Filter by status, priority, or full-text search
- ✅ Multi-user task assignment (users can pick from a dropdown)
- ✅ Comments on tasks
- ✅ Activity log (status changes, edits, comments)

### Dashboard Analytics
- ✅ Total / In Progress / Completed / Overdue counts
- ✅ Completion rate progress bar
- ✅ Open tasks broken down by priority (urgent / high / medium / low)
- ✅ 7-day task creation trend bar chart
- ✅ Real-time refresh on every mutation

### UX / UI
- ✅ Mobile-first responsive design (375px → desktop)
- ✅ Sticky header with user avatar + role
- ✅ Color-coded priority badges (urgent = rose, high = amber, etc.)
- ✅ Status dot indicators on cards
- ✅ Toast notifications (Sonner) for every action
- ✅ Loading states + empty-state illustrations
- ✅ Accessible (semantic HTML, ARIA labels, keyboard navigation)

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # register · login · logout · me
│   │   ├── tasks/         # CRUD + comments
│   │   ├── dashboard/     # aggregated stats
│   │   ├── users/         # list (for assignment)
│   │   ├── seed/          # one-click demo data
│   │   └── route.ts      # root health-check
│   ├── layout.tsx         # root layout (metadata, Toaster)
│   ├── page.tsx           # full TaskFlow SPA (auth + dashboard + tasks)
│   └── globals.css
├── components/ui/          # shadcn/ui (trimmed to what we use)
├── lib/
│   ├── auth.ts            # JWT cookie sessions
│   ├── db.ts              # Prisma client singleton
│   └── utils.ts           # cn() helper
└── prisma/schema.prisma   # User · Task · Comment · Activity
```

### Data Model

```
User 1───* Task *───1 User (assignee + creator)
Task 1───* Comment *───1 User
Task 1───* Activity *───1 User
```

| Model | Purpose |
|---|---|
| `User` | email, name, bcrypt-hashed password, role |
| `Task` | title, description, status, priority, dueDate, tags (JSON), assignee, creator |
| `Comment` | threaded discussion per task |
| `Activity` | audit log of all mutations (status changes, edits, comments) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18 (or [Bun](https://bun.sh) ≥ 1.0)
- npm / pnpm / bun

### Install & Run

```bash
# 1. Install dependencies
npm install   # or: bun install

# 2. Configure environment
cp .env.example .env

# 3. Push Prisma schema to the SQLite DB
npm run db:push

# 4. Start the dev server
npm run dev
# App boots at http://localhost:3000

# 5. (optional) Seed demo data — visit /api/seed via POST,
#    OR click "Seed Demo Data" on the login screen
curl -X POST http://localhost:3000/api/seed
```

### Demo Credentials

After seeding:
- **Email:** `demo@arrowstack.org`
- **Password:** `Demo@12345`

The seeded account comes with 8 pre-populated tasks (a mix of done/in-progress/review/todo) so the dashboard is immediately populated.

---

## 📡 API Reference

Base URL: `http://localhost:3000`

### Auth

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | `{ email, name, password }` → sets session cookie |
| `POST` | `/api/auth/login` | `{ email, password }` → sets session cookie |
| `POST` | `/api/auth/logout` | Clears the session cookie |
| `GET` | `/api/auth/me` | Returns the current user |

### Tasks

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/tasks?status=&priority=&q=` | List tasks (filtered + searched) |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/:id` | Get task with comments + activity log |
| `PATCH` | `/api/tasks/:id` | Update task fields (status, priority, etc.) |
| `DELETE` | `/api/tasks/:id` | Delete (creator only) |
| `POST` | `/api/tasks/:id/comments` | Add a comment |

### Dashboard & Users

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated stats for the dashboard |
| `GET` | `/api/users` | List users for assignment dropdown |
| `POST` | `/api/seed` | One-click demo data seed |
| `GET` | `/api` | API health-check |

### Example: Register + Create Task

```bash
BASE=http://localhost:3000

# 1. Register (also sets the cookie in cookie jar)
curl -c cookies.txt -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","name":"You","password":"Strong@123"}'

# 2. Create a task
curl -b cookies.txt -X POST $BASE/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Submit Arrowstack tasks",
    "description": "Push repos + LinkedIn posts before deadline",
    "priority": "urgent",
    "dueDate": "2026-09-22",
    "tags": ["submission", "deadline"]
  }'

# 3. Fetch dashboard stats
curl -b cookies.txt $BASE/api/dashboard
```

---

## 🎨 UI Highlights

| View | Features |
|---|---|
| **Auth screen** | Login / Sign-Up toggle, demo data seeding button |
| **Dashboard** | 4 stat cards (total / in-progress / done / overdue), completion rate progress, priority breakdown bars, 7-day creation trend chart |
| **Tasks grid** | Filterable card grid, search, status + priority filters, "New Task" CTA |
| **Task card** | Color-coded priority badge, status dot, due-date pill, tag chips, inline status change |
| **Task detail dialog** | Full task info, status editor, due-date with countdown, comment thread |

---

## 🛠️ Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Server components + API routes in one app, RSC streaming |
| Language | **TypeScript 5** | Type-safety across the stack |
| Database | **Prisma ORM + SQLite** | Type-safe queries, zero-config, file-based |
| Auth | **bcryptjs + jsonwebtoken + HTTP-only cookies** | Stateless, horizontally scalable |
| Styling | **Tailwind CSS 4** | Utility-first, responsive by default |
| UI Library | **shadcn/ui (New York)** | Accessible, customizable, beautiful defaults |
| Icons | **lucide-react** | Tree-shakable, consistent style |
| Toasts | **sonner** | Modern, accessible notifications |
| Validation | **Zod** | Schema-first, type-safe validation |

---

## 🔒 Security Highlights

- ✅ Passwords hashed with **bcrypt** (10 rounds)
- ✅ Sessions stored as **HTTP-only JWT cookies** (no localStorage XSS exposure)
- ✅ Cookies set with `sameSite=lax` + `secure` in production
- ✅ Every API route validates the session
- ✅ **Zod** validates all input
- ✅ Tasks scoped to creator + assignee — no cross-tenant data leaks
- ✅ Only the task creator may delete

---

## 📋 Roadmap (Stretch Goals)

- [ ] Drag-and-drop Kanban board (@dnd-kit already a dep)
- [ ] Real-time collaboration (socket.io)
- [ ] File attachments on tasks
- [ ] Email notifications for assigned tasks
- [ ] Migration to PostgreSQL for production
- [ ] Dark mode toggle (next-themes already a dep)
- [ ] PWA + offline support

---

## 👩‍💻 Author

**Bhumika Gandhi**
- Email: bhumika2005gandhi@gmail.com
- Roll/App ID: AS-2026-7346
- Institution: Jagannath Community College
- Cohort: Arrowstack Batch 2026 (Full Stack Development)

---

## 📜 License

MIT — for educational use under the Arrowstack Technologies internship program.

---

> *Built as part of Arrowstack Batch 2026 Full Stack Development Internship — Ref: AS-2026-7346*
