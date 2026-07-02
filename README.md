# AI Workflow Ops Dashboard

AI Workflow Ops Dashboard is a full-stack application for creating, scheduling, executing, and monitoring AI-powered workflows. It supports multi-provider LLM routing, multi-step workflow execution, scheduled runs, execution history, token and cost tracking, and dashboard-level observability.

Built as a portfolio project to demonstrate production-quality full-stack and AI integration skills.

---

## Why This Project

| Skill | How it's demonstrated |
|---|---|
| **Next.js 16 (App Router)** | Server Components for DB reads, Client Components for interactive UI |
| **TypeScript** | Strict types throughout — API contracts, Prisma models, shared enums |
| **Tailwind CSS 4** | Responsive utility-first UI with a clean design system |
| **PostgreSQL** | Relational schema with indexes, cascade deletes, enum types |
| **Prisma ORM 7** | Type-safe queries, migrations, PrismaPg adapter, singleton client |
| **Multi-provider AI** | Anthropic Claude, OpenAI GPT, Google Gemini — swappable per execution |
| **Docker** | Multi-stage Dockerfile + Compose for reproducible environments |
| **Zod** | Runtime validation at all API boundaries |
| **Security** | API keys in env vars only, server-only AI calls, no client-side secrets |
| **Claude Code** | Entire project built with Claude Code as AI pair programmer |

---

## Features

### Core

- **Dashboard** — 8 live metrics: total workflows, executions, success rate, avg duration, total tokens, estimated cost, provider breakdown, recent failures
- **Workflow CRUD** — Create/view/delete workflows with 5 built-in types
- **Multi-provider execution** — Choose Anthropic, OpenAI, or Gemini per run from the UI
- **Execution History** — Full history with status, provider, model, duration, token count, and estimated cost per run

### Execution Engine

- **Execution State Machine** — `PENDING → RUNNING → COMPLETED / FAILED` with timestamps and duration tracking
- **Token & Cost Tracking** — Captures input/output tokens from each provider; estimates USD cost from a built-in pricing table
- **Trigger Type** — Records whether each execution was `MANUAL` or `SCHEDULED`

### Multi-step Workflows

- **Workflow Steps** — Define multiple steps per workflow, each with its own system prompt, user prompt, provider override, and output key
- **Template Variables** — Reference previous step outputs in prompts using `{{workflow.input}}`, `{{latestOutput}}`, `{{steps.<key>.output}}`
- **Step Execution Records** — Each step run is recorded independently with its own token/cost data
- **Backward Compatible** — Workflows without steps use the default type-based prompt; no migration needed

### Scheduling

- **Workflow Schedule** — Set a cron expression per workflow; supports timezone (default: Asia/Taipei)
- **Cron Presets** — Quick-select hourly, daily, weekly options from the UI
- **Schedule Management** — Enable/disable, update, or delete schedules; displays last run and next run times
- **Scheduler Service** — `src/lib/scheduler.ts` runs scheduled executions as `SCHEDULED` trigger type

### 5 Built-in Workflow Types

| Type | Purpose |
|---|---|
| Text Summarization | One-sentence overview + bullet points + conclusions |
| Professional Rewrite | Rewrites to clear, polished business communication |
| Task Breakdown | Numbered tasks with effort (S/M/L), dependencies, and execution order |
| GitHub Issue Analysis | Type + severity + affected components + suggested actions |
| Meeting Notes Extraction | Summary + decisions + action items + open questions + next steps |

---

## Architecture

```
Browser (React / Next.js Client Components)
        │
        ▼
Next.js App Router (Server Components + API Routes)
        │
        ├── /api/dashboard/stats              GET aggregated metrics
        ├── /api/workflows                    GET list, POST create
        ├── /api/workflows/[id]               GET detail, DELETE
        ├── /api/workflows/[id]/run           POST → AI → DB
        ├── /api/workflows/[id]/schedule      GET/POST/PATCH/DELETE
        ├── /api/workflows/[id]/steps         GET/POST
        └── /api/workflows/[id]/steps/[sid]  PATCH/DELETE
                │
                ├── Prisma ORM (PrismaPg adapter) → PostgreSQL
                │
                └── AI Service Layer (src/lib/ai/)
                        ├── index.ts          runWorkflow() orchestrator
                        ├── step-runner.ts    runSteps() multi-step engine
                        ├── template.ts       {{variable}} resolver
                        ├── prompts.ts        5 built-in prompt templates
                        ├── costs.ts          Model pricing map
                        ├── types.ts          AIProviderResult type
                        └── providers/
                            ├── anthropic.ts  Anthropic SDK
                            ├── openai.ts     OpenAI SDK
                            └── gemini.ts     Google Generative AI SDK
```

---

## Database Schema

```
Workflow
├── id, title, type, input, latestOutput
├── status       DRAFT | RUNNING | COMPLETED | FAILED
├── createdAt, updatedAt
├── executions   → WorkflowExecution[]
├── schedule     → WorkflowSchedule?
└── steps        → WorkflowStep[]

WorkflowExecution
├── id, workflowId (FK cascade)
├── input, output, inputSnapshot
├── status       PENDING | QUEUED | RUNNING | COMPLETED | FAILED | CANCELLED | RETRYING
├── provider     ANTHROPIC | OPENAI | GEMINI
├── triggerType  MANUAL | SCHEDULED | WEBHOOK | API
├── model, errorMessage
├── durationMs, startedAt, completedAt
├── inputTokens, outputTokens, totalTokens, estimatedCostUsd
└── stepExecutions → WorkflowStepExecution[]

WorkflowStep
├── id, workflowId (FK cascade), order
├── name, type, provider?
├── systemPrompt, userPrompt, inputMapping?
└── outputKey (for use as {{steps.<outputKey>.output}})

WorkflowStepExecution
├── id, executionId (FK cascade), stepId (FK cascade)
├── status, provider, model
├── input, output, errorMessage
├── inputTokens, outputTokens, totalTokens, estimatedCostUsd
└── startedAt, completedAt

WorkflowSchedule
├── id, workflowId (FK cascade, @unique)
├── cronExpression, timezone
├── isActive, lastRunAt, nextRunAt
└── createdAt, updatedAt
```

---

## Tech Stack

- **Frontend**: Next.js 16.2, React 19, TypeScript 5, Tailwind CSS 4
- **Backend**: Next.js API Routes, Prisma ORM 7, Zod validation
- **Database**: PostgreSQL 16
- **AI SDKs**: `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`
- **Scheduling**: `node-cron`, `cron-parser`
- **Infrastructure**: Docker, Docker Compose

---

## Local Setup

### Prerequisites

- Node.js 22+
- Docker Desktop
- At least one AI provider API key (Anthropic, OpenAI, or Gemini)

### 1. Clone and install

```bash
git clone https://github.com/ChunJen/My-AI-Workflow.git
cd My-AI-Workflow
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/ai_workflow_ops"

# Anthropic Claude
ANTHROPIC_API_KEY="sk-ant-..."
AI_MODEL="claude-sonnet-4-6"

# OpenAI
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4o-mini"

# Google Gemini
GEMINI_API_KEY="AIza..."
GEMINI_MODEL="gemini-2.0-flash"
```

You only need the keys for providers you intend to use.

### 3. Start the database

```bash
docker compose up postgres -d
```

### 4. Run migrations

```bash
npx prisma migrate deploy
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scheduled Execution

The scheduler is a standalone Node.js process that runs cron jobs alongside the Next.js app. It is **not** embedded in the Next.js runtime.

> **MVP note:** In development, restart the scheduler process after adding/changing schedules — it loads active schedules at startup. A production deployment would run this as a separate container or background service.

To start the scheduler (in a separate terminal):

```bash
npx tsx src/lib/scheduler.ts
```

Or use `ts-node`:

```bash
npx ts-node --project tsconfig.json src/lib/scheduler.ts
```

For Docker deployment, the `docker-compose.yml` can be extended with a separate `scheduler` service pointing to the same image.

---

## Docker Setup (full stack)

```bash
cp .env.example .env
# Fill in your API keys in .env

docker compose up --build
```

- App: http://localhost:3000
- PostgreSQL is exposed on port `5433`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Optional* | Anthropic Claude API key |
| `AI_MODEL` | No | Anthropic model (default: `claude-sonnet-4-6`) |
| `OPENAI_API_KEY` | Optional* | OpenAI API key |
| `OPENAI_MODEL` | No | OpenAI model (default: `gpt-4o-mini`) |
| `GEMINI_API_KEY` | Optional* | Google Gemini API key |
| `GEMINI_MODEL` | No | Gemini model (default: `gemini-2.0-flash`) |

*At least one provider key is required.

---

## Prisma Commands

```bash
# Generate client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <name>

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                         # Dashboard with live metrics
│   ├── layout.tsx                       # Root layout + navbar
│   ├── workflows/
│   │   ├── page.tsx                     # Workflow list
│   │   ├── new/page.tsx                 # Create workflow
│   │   └── [id]/page.tsx                # Detail: run, steps, schedule, history
│   └── api/
│       ├── dashboard/stats/route.ts     # GET aggregated stats
│       └── workflows/
│           ├── route.ts                 # GET list, POST create
│           └── [id]/
│               ├── route.ts             # GET detail, DELETE
│               ├── run/route.ts         # POST execute (single or multi-step)
│               ├── schedule/route.ts    # GET/POST/PATCH/DELETE schedule
│               └── steps/
│                   ├── route.ts         # GET/POST steps
│                   └── [stepId]/route.ts # PATCH/DELETE step
├── components/
│   ├── ui/                              # Badge, Button, Card
│   ├── Navbar.tsx
│   ├── StatusBadge.tsx
│   ├── ExecutionHistory.tsx             # History with tokens/cost/duration
│   ├── WorkflowSteps.tsx                # Step management UI
│   └── WorkflowSchedule.tsx             # Schedule management UI
├── lib/
│   ├── prisma.ts                        # Singleton Prisma client (PrismaPg adapter)
│   ├── scheduler.ts                     # node-cron scheduler service
│   ├── validations.ts                   # Zod schemas
│   └── ai/
│       ├── index.ts                     # runWorkflow() entry point
│       ├── step-runner.ts               # runSteps() multi-step engine
│       ├── template.ts                  # {{variable}} template resolver
│       ├── prompts.ts                   # 5 built-in prompt templates
│       ├── costs.ts                     # Model pricing table
│       ├── types.ts                     # AIProviderResult type
│       └── providers/
│           ├── anthropic.ts             # Anthropic SDK
│           ├── openai.ts                # OpenAI SDK
│           └── gemini.ts                # Google Generative AI SDK
├── types/workflow.ts                    # Shared TypeScript types + label maps
prisma/
├── schema.prisma                        # Full DB schema
└── migrations/                          # Migration history
Dockerfile                               # Multi-stage production build
docker-compose.yml                       # App + PostgreSQL services
prisma.config.ts                         # Prisma CLI config (Prisma 7)
```

---

## Future Roadmap

- [ ] Provider Comparison — run same input across all providers and compare outputs side-by-side
- [ ] Retry / Rerun — retry failed executions with original input snapshot
- [ ] Prompt Versioning — track prompt changes per step, link executions to prompt versions
- [ ] Streaming responses — Server-Sent Events for real-time output
- [ ] Webhook triggers — run workflows via external HTTP events
- [ ] Authentication — NextAuth.js or Clerk
- [ ] Export execution history as CSV
- [ ] GitHub Actions CI/CD pipeline
- [ ] Team workspaces
