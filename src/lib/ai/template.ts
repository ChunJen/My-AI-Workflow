/**
 * Resolves template variables in prompt strings.
 *
 * Supported variables:
 *   {{workflow.input}}          — the workflow's original input
 *   {{steps.<outputKey>.output}} — output from a previous step by its outputKey
 *   {{latestOutput}}             — most recent step output
 */
export type StepContext = {
  workflowInput: string;
  stepOutputs: Record<string, string>;
  latestOutput: string;
};

export function resolveTemplate(template: string, ctx: StepContext): string {
  return template
    .replace(/\{\{workflow\.input\}\}/g, ctx.workflowInput)
    .replace(/\{\{latestOutput\}\}/g, ctx.latestOutput)
    .replace(/\{\{steps\.([^}]+)\.output\}\}/g, (_, key: string) => {
      return ctx.stepOutputs[key] ?? "";
    });
}
