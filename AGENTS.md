# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Project-specific gotchas

### Prisma 7 — breaking changes from Prisma 5/6

- `url` is NOT in `prisma/schema.prisma`. Database URL lives in `prisma.config.ts` (CLI) and in the runtime `PrismaPg` adapter.
- Import the client from `@/generated/prisma/client`, NOT from `@prisma/client`.
- The generator is `provider = "prisma-client"`, not `"prisma-client-js"`.
- After every schema change: run `npx prisma migrate dev --name <name>` then `npx prisma generate`.
- When changing a PostgreSQL enum column to TEXT, Prisma cannot auto-generate a safe migration. Use `--create-only` to get the file, then replace the DROP+ADD COLUMN with `ALTER COLUMN "col" TYPE TEXT USING "col"::TEXT`.

### PostgreSQL runs on port 5433

The Docker Compose postgres service maps `5433:5432` to avoid conflicts with local installs. Always use port `5433` in `DATABASE_URL`.

### WorkflowType is a String, not an enum

`Workflow.type` is a plain `TEXT` column backed by `WorkflowTypeConfig.slug`. There is no `WorkflowType` PostgreSQL enum. The TypeScript type alias `WorkflowType = string` exists only for label lookup backwards compatibility. When displaying a type name, look up `WorkflowTypeConfig` from the DB or use `WORKFLOW_TYPE_LABELS[type] ?? type` as a fallback.

### WorkflowTypeConfig — where type configs live

`WorkflowTypeConfig` (table `"WorkflowTypeConfig"`) stores per-type config:

| Field | Description |
|---|---|
| `slug` | Unique string key, e.g. `TEXT_SUMMARIZATION` |
| `label` | Display name |
| `description` | Short description shown in dropdowns |
| `systemPrompt` | System prompt sent to the AI |
| `userPromptTemplate` | User prompt template; `{{input}}` is replaced with `workflow.input` |
| `isEnabled` | Hidden from New Workflow form if false |
| `isBuiltIn` | Cannot be deleted if true |

The 5 built-in configs are seeded in migration `20260702044110_add_workflow_type_config`.

### AI providers — three SDKs, one result type

All provider functions return `AIProviderResult` (defined in `src/lib/ai/types.ts`), not a plain string.

**Entry points in `src/lib/ai/index.ts`:**

- `runWorkflow(systemPrompt, userPrompt, provider)` — low-level; call with explicit prompt strings
- `runWorkflowByType(type, input, provider, configOverride?)` — looks up `WorkflowTypeConfig` from the DB (passed as `configOverride`), falls back to hardcoded templates in `prompts.ts`

**Never call provider functions directly from API routes.** API routes should:
1. Fetch `WorkflowTypeConfig` from the DB: `await prisma.workflowTypeConfig.findUnique({ where: { slug: workflow.type } })`
2. Pass it as `configOverride` to `runWorkflowByType()`

Environment variables per provider:
- Anthropic: `ANTHROPIC_API_KEY` (falls back to `AI_API_KEY`), `AI_MODEL`
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`
- Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`

### Scheduler is a standalone process

`src/lib/scheduler.ts` uses `node-cron` and must run as a separate Node.js process — it cannot be embedded in Next.js API routes or Server Components. Do not call `startScheduler()` from anywhere inside `src/app/`.

### Multi-step template variables

When writing step prompts, these variables are resolved at runtime by `src/lib/ai/template.ts`:

```
{{workflow.input}}              — the workflow's original input text
{{latestOutput}}                — output from the most recently completed step
{{steps.<outputKey>.output}}    — output from a specific step by its outputKey field
```

### Execution flow

Single-step (no `WorkflowStep` records): calls `runWorkflowByType()` with the DB config looked up by `workflow.type`.
Multi-step (`WorkflowStep` records exist): calls `runSteps()` in `src/lib/ai/step-runner.ts`. Both paths write to the same `WorkflowExecution` record.

### React 19 — no setState in effect body

Calling a function that calls `setState` directly inside a `useEffect` body triggers the `react-hooks/set-state-in-effect` lint error. Always use an IIFE pattern with a cancellation flag:

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    const data = await fetchSomething();
    if (!cancelled) setState(data);
  })();
  return () => { cancelled = true; };
}, [dependency]);
```

### Before committing

```bash
npm run lint
npm run build
```

Both must pass. Fix all errors before pushing.
