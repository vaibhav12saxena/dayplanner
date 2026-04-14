export type TaskStatus = "backlog" | "today" | "tomorrow" | "in_progress" | "done";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface UserBrief {
  id: number;
  username: string;
  full_name: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  daily_work_hours: number;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface TaskBrief {
  id: number;
  title: string;
  status: string;
  priority: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  allocated_hours: number;
  hours_spent: number;
  project: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  date_assigned: string | null;
  delivery_date: string | null;
  due_date: string | null;
  sort_order: number;
  assignee_id: number | null;
  creator_id: number | null;
  assignee: UserBrief | null;
  creator: UserBrief | null;
  tags: Tag[];
  blocked_by: TaskBrief[];
}

export interface OverflowInfo {
  current_total_hours: number;
  daily_limit: number;
  overflow_task_id: number | null;
  overflow_task_title: string | null;
  message: string;
}

export interface MoveResponse {
  task: Task;
  overflow: OverflowInfo | null;
}

export interface ApprovalRequest {
  id: number;
  task_id: number;
  task?: Task;
  requested_target: "today" | "tomorrow";
  status: ApprovalStatus;
  requested_at: string;
  resolved_at: string | null;
  note: string;
  delivery_date: string | null;
  requested_by: UserBrief | null;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user: UserBrief | null;
}

export interface DailySummary {
  date: string;
  tasks_completed: Task[];
  total_hours_spent: number;
  total_hours_allocated: number;
}

export interface DayStats {
  date: string;
  hours_allocated: number;
  hours_spent: number;
  tasks_completed: number;
  tasks_total: number;
}

export interface AnalyticsData {
  daily_stats: DayStats[];
  total_completed: number;
  total_tasks: number;
  completion_rate: number;
  avg_hours_per_day: number;
  priority_breakdown: Record<string, number>;
}

export interface RecurringRule {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  allocated_hours: number;
  project: string;
  frequency: string;
  is_active: boolean;
  last_generated: string | null;
  created_at: string;
}
