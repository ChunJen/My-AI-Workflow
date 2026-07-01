export type WorkflowType =
  | "TEXT_SUMMARIZATION"
  | "PROFESSIONAL_REWRITE"
  | "TASK_BREAKDOWN"
  | "GITHUB_ISSUE_ANALYSIS"
  | "MEETING_NOTES_EXTRACTION";

export type WorkflowStatus = "DRAFT" | "RUNNING" | "COMPLETED" | "FAILED";

export type ExecutionStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "RETRYING";

export type TriggerType = "MANUAL" | "SCHEDULED" | "WEBHOOK" | "API";

export type AIProvider = "ANTHROPIC" | "OPENAI" | "GEMINI";

export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  TEXT_SUMMARIZATION: "Text Summarization",
  PROFESSIONAL_REWRITE: "Professional Rewrite",
  TASK_BREAKDOWN: "Task Breakdown",
  GITHUB_ISSUE_ANALYSIS: "GitHub Issue Analysis",
  MEETING_NOTES_EXTRACTION: "Meeting Notes Extraction",
};

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  ANTHROPIC: "Anthropic Claude",
  OPENAI: "OpenAI GPT",
  GEMINI: "Google Gemini",
};

export const AI_PROVIDER_MODELS: Record<AIProvider, string> = {
  ANTHROPIC: "claude-sonnet-4-6",
  OPENAI: "gpt-4o-mini",
  GEMINI: "gemini-2.0-flash",
};

export interface Workflow {
  id: string;
  title: string;
  type: WorkflowType;
  input: string;
  latestOutput: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  executions?: WorkflowExecution[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  input: string;
  output: string | null;
  status: ExecutionStatus;
  provider: AIProvider;
  triggerType: TriggerType;
  model: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
