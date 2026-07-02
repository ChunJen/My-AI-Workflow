# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Project-specific gotchas

### Prisma 7 — breaking changes from Prisma 5/6

- `url` is NOT in `prisma/schema.prisma`. Database URL lives in `prisma.config.ts` (CLI) and in the runtime `PrismaPg` adapter.
- Import the client from `@/generated/prisma/client`, NOT from `@prisma/client`.
- The generator is `provider = "prisma-client"`, not `"prisma-client-js"`.
- After every schema change: run `npx prisma migrate dev --name <name>` then `npx prisma generate`.

### PostgreSQL runs on port 5433

The Docker Compose postgres service maps `5433:5432` to avoid conflicts with local installs. Always use port `5433` in `DATABASE_URL`.

### AI providers — three SDKs, one result type

All provider functions return `AIProviderResult` (defined in `src/lib/ai/types.ts`), not a plain string. The entry point is `runWorkflow()` in `src/lib/ai/index.ts`. Never call provider functions directly from API routes.

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

Single-step (no WorkflowStep records): uses `runWorkflow()` with the workflow's `type` field.
Multi-step (WorkflowStep records exist): uses `runSteps()` in `src/lib/ai/step-runner.ts`. Both paths write to the same `WorkflowExecution` record.

### Before committing

```bash
npm run lint
npm run build
```

Both must pass. Fix all errors before pushing.
