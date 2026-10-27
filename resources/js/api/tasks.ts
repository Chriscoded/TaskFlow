
import { request } from "./http";
import type {
  PaginatedTasks,
  Task,
  TaskFilters,
  TaskInput,
} from "../types/task";

export async function getTasks(
  filters: TaskFilters & { search?: string } = {},
): Promise<PaginatedTasks> {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  params.set("page", String(filters.page ?? 1));

  return request<PaginatedTasks>(`/tasks?${params.toString()}`);
}

export async function getTask(id: number): Promise<Task> {
  const response = await request<{ data: Task }>(`/tasks/${id}`);
  return response.data;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const response = await request<{ data: Task }>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function updateTask(
  id: number,
  input: Partial<TaskInput>,
): Promise<Task> {
  const response = await request<{ data: Task }>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function deleteTask(id: number): Promise<void> {
  await request<void>(`/tasks/${id}`, {
    method: "DELETE",
  });
}
