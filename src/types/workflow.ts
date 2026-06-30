export type WorkflowType =
  | "TEXT_SUMMARIZATION"
  | "PROFESSIONAL_REWRITE"
  | "TASK_BREAKDOWN"
  | "GITHUB_ISSUE_ANALYSIS"
  | "MEETING_NOTES_EXTRACTION";

export type WorkflowStatus = "DRAFT" | "RUNNING" | "COMPLETED" | "FAILED";
export type ExecutionStatus = "RUNNING" | "COMPLETED" | "FAILED";

export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  TEXT_SUMMARIZATION: "Text Summarization",
  PROFESSIONAL_REWRITE: "Professional Rewrite",
  TASK_BREAKDOWN: "Task Breakdown",
  GITHUB_ISSUE_ANALYSIS: "GitHub Issue Analysis",
  MEETING_NOTES_EXTRACTION: "Meeting Notes Extraction",
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
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}
