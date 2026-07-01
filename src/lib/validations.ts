import { z } from "zod";

export const WorkflowTypeSchema = z.enum([
  "TEXT_SUMMARIZATION",
  "PROFESSIONAL_REWRITE",
  "TASK_BREAKDOWN",
  "GITHUB_ISSUE_ANALYSIS",
  "MEETING_NOTES_EXTRACTION",
]);

export const AIProviderSchema = z.enum(["ANTHROPIC", "OPENAI", "GEMINI"]);

export const CreateWorkflowSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  type: WorkflowTypeSchema,
  input: z
    .string()
    .min(10, "Input must be at least 10 characters")
    .max(10000, "Input must be under 10,000 characters"),
});

export const RunWorkflowSchema = z.object({
  provider: AIProviderSchema.default("ANTHROPIC"),
});

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type RunWorkflowInput = z.infer<typeof RunWorkflowSchema>;
