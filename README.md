# AI Workflow Ops Dashboard

A full-stack web application for creating, managing, and running **AI-powered automation workflows**. Built as a portfolio project to demonstrate production-quality Web Developer & AI Specialist skills.

---

## Why This Project

This project showcases hands-on experience across the full modern web development stack:

| Skill | How it's demonstrated |
|---|---|
| **Next.js (App Router)** | Server Components for DB reads, Client Components for interactive forms |
| **TypeScript** | Strict types throughout — API contracts, Prisma models, shared enums |
| **Tailwind CSS** | Responsive, utility-first UI with a clean design system |
| **PostgreSQL** | Relational schema with proper indexes, cascade deletes, enum types |
| **Prisma ORM** | Type-safe queries, migrations, singleton client for serverless |
| **AI Integration** | Claude API with prompt templates, error handling, provider abstraction |
| **Docker** | Multi-stage Dockerfile + Compose for reproducible local/production environments |
| **Security** | API keys in env vars only, Zod validation on all inputs, server-only AI calls |
| **Claude Code** | Entire project built with Claude Code as AI pair programmer |

---

## Features

- **Dashboard** — Live stats (total, completed, failed, success rate) + recent executions table
- **Workflow List** — All workflows with status, type, run count, and dates
- **Create Workflow** — Form with 5 AI workflow types and live character count
- **Workflow Detail** — Input/output side-by-side, run button, full execution history with durations
- **5 Workflow Types**:
  - Text Summarization
  - Professional Rewrite
  - Task Breakdown
  - GitHub Issue Analysis
  - Meeting Notes Extraction

---

## Architecture

```
Browser (React / Next.js Client Components)
        │
        ▼
Next.js App Router (Server Components + API Routes)
        │
        ├── /api/workflows          GET list, POST create
        ├── /api/workflows/[id]     GET detail, DELETE
        └── /api/workflows/[id]/run POST → AI service → DB update
                │
                ├── Prisma ORM → PostgreSQL
                │
                └── AI Service Layer
                        ├── prompts.ts       (5 prompt templates)
                        ├── providers/
                        │   └── anthropic.ts (Anthropic SDK)
                        └── index.ts         (runWorkflow orchestrator)
```

---

## Database Schema

```
Workflow
├── id           cuid (PK)
├── title        string
├── type         enum (5 types)
├── input        text
├── latestOutput text?
├── status       enum (DRAFT | RUNNING | COMPLETED | FAILED)
├── createdAt    datetime
├── updatedAt    datetime
└── executions   → WorkflowExecution[]

WorkflowExecution
├── id           cuid (PK)
├── workflowId   string (FK → Workflow, CASCADE DELETE)
├── input        text
├── output       text?
├── status       enum (RUNNING | COMPLETED | FAILED)
├── errorMessage string?
├── startedAt    datetime
├── completedAt  datetime?
└── createdAt    datetime
```

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes, Prisma ORM, Zod validation
- **Database**: PostgreSQL 16
- **AI**: Anthropic Claude via `@anthropic-ai/sdk`
- **Infrastructure**: Docker, Docker Compose

---

## Local Setup

### Prerequisites

- Node.js 22+
- Docker Desktop (for the database)
- An Anthropic API key ([get one here](https://console.anthropic.com))

### 1. Clone and install

```bash
git clone https://github.com/your-username/ai-workflow-ops.git
cd ai-workflow-ops
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/ai_workflow_ops"
AI_API_KEY="your-anthropic-api-key"
AI_MODEL="claude-sonnet-4-6"
```

### 3. Start the database

```bash
docker compose up postgres -d
```

### 4. Run migrations

```bash
npx prisma migrate dev --name init
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker Setup (full stack)

Run the complete app with a single command:

```bash
# Copy and fill in your API key
cp .env.example .env
# Edit .env: set AI_API_KEY=your-key

docker compose up --build
```

- App: http://localhost:3000
- PostgreSQL is exposed on port `5433` (avoids conflict with local installs)

---

## Prisma Commands

```bash
# Generate client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

---

## AI Provider

The AI service in `src/lib/ai/` is built for easy provider swapping:

- Default: **Anthropic Claude** (`claude-sonnet-4-6`)
- To use a different model: change `AI_MODEL` in your env
- To add a new provider: implement a new file in `src/lib/ai/providers/` and update `src/lib/ai/index.ts`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AI_API_KEY` | Yes | Anthropic API key |
| `AI_MODEL` | No | Model ID (default: `claude-sonnet-4-6`) |
| `NODE_ENV` | No | `development` or `production` |

---

## Future Improvements

- [ ] Authentication (NextAuth.js or Clerk)
- [ ] Scheduled workflow execution (cron jobs)
- [ ] Streaming AI responses with Server-Sent Events
- [ ] Webhook triggers — run workflows via external events
- [ ] Rate limiting middleware
- [ ] OpenAI / Ollama provider adapters
- [ ] Export execution history as CSV
- [ ] Team workspaces and sharing
- [ ] CI/CD pipeline with GitHub Actions

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── layout.tsx                  # Root layout with navbar
│   ├── globals.css
│   ├── workflows/
│   │   ├── page.tsx                # Workflow list
│   │   ├── new/page.tsx            # Create workflow form
│   │   └── [id]/page.tsx           # Workflow detail + history
│   └── api/workflows/
│       ├── route.ts                # GET list, POST create
│       └── [id]/
│           ├── route.ts            # GET detail, DELETE
│           └── run/route.ts        # POST run → AI
├── components/
│   ├── ui/                         # Badge, Button, Card
│   ├── Navbar.tsx
│   ├── StatusBadge.tsx
│   └── ExecutionHistory.tsx
├── lib/
│   ├── prisma.ts                   # Singleton Prisma client
│   ├── validations.ts              # Zod schemas
│   └── ai/
│       ├── index.ts                # runWorkflow()
│       ├── prompts.ts              # Prompt templates
│       └── providers/anthropic.ts  # Anthropic SDK wrapper
├── types/workflow.ts               # Shared TypeScript types
prisma/schema.prisma                # DB schema
Dockerfile                          # Multi-stage production build
docker-compose.yml                  # App + PostgreSQL services
```
