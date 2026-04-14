import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types";

const priorityColors: Record<TaskPriority, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

const statusColors: Record<TaskStatus, string> = {
  backlog: "bg-gray-100 text-gray-800 border-gray-200",
  today: "bg-blue-100 text-blue-800 border-blue-200",
  tomorrow: "bg-purple-100 text-purple-800 border-purple-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  done: "bg-green-100 text-green-800 border-green-200",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", priorityColors[priority])}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const labels: Record<TaskStatus, string> = {
    backlog: "Backlog",
    today: "Today",
    tomorrow: "Tomorrow",
    in_progress: "In Progress",
    done: "Done",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", statusColors[status])}>
      {labels[status]}
    </span>
  );
}
