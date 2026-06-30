import { Badge } from "@/components/ui/Badge";
import type { WorkflowStatus, ExecutionStatus } from "@/types/workflow";

type Status = WorkflowStatus | ExecutionStatus;

const statusConfig: Record<
  Status,
  { label: string; variant: "default" | "success" | "error" | "warning" | "info" }
> = {
  DRAFT: { label: "Draft", variant: "default" },
  RUNNING: { label: "Running", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  FAILED: { label: "Failed", variant: "error" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
