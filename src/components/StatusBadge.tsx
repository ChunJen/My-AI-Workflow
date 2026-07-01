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
  PENDING: { label: "Pending", variant: "default" },
  QUEUED: { label: "Queued", variant: "warning" },
  CANCELLED: { label: "Cancelled", variant: "default" },
  RETRYING: { label: "Retrying", variant: "warning" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
