
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "done",
] as const;

export const TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  page?: number;
}

export interface PaginatedTasks {
  data: Task[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}
