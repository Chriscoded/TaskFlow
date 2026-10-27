
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { TaskStatus, TaskPriority, Task, TaskInput } from "./types/task"; 
import Toast, { type ToastVariant } from "./components/Toast";

const tasksEndpoint = "/api/tasks";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const validationErrors = payload?.errors
      ? Object.values(payload.errors as Record<string, string[]>).flat()[0]
      : undefined;
    throw new Error(validationErrors || payload?.message || "The request failed.");
  }

  return payload as T;
}

function taskFromResponse(payload: Task | { data: Task }): Task {
  return "data" in payload ? payload.data : payload;
}

async function getTasks(params: {
  status?: TaskStatus;
  priority?: TaskPriority;
  search: string;
  page: number;
}): Promise<{ data: Task[]; meta: { current_page: number; last_page: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.priority) query.set("priority", params.priority);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page));
  return request(`${tasksEndpoint}?${query.toString()}`);
}

async function getTask(id: Task["id"]): Promise<Task> {
  return taskFromResponse(await request(`${tasksEndpoint}/${id}`));
}

async function createTask(input: TaskInput): Promise<Task> {
  return taskFromResponse(
    await request(tasksEndpoint, { method: "POST", body: JSON.stringify(input) }),
  );
}

async function updateTask(id: Task["id"], input: Partial<TaskInput>): Promise<Task> {
  return taskFromResponse(
    await request(`${tasksEndpoint}/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  );
}  

async function deleteTask(id: Task["id"]): Promise<void> {
  await request(`${tasksEndpoint}/${id}`, { method: "DELETE" });
}

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Completed",
};

type TaskFormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
};

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  due_date: "",
};

function toTaskInput(form: TaskFormState): TaskInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    priority: form.priority,
    due_date: form.due_date || null,
  };
}

function taskToForm(task: Task): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ?? "",
  };
}

function TaskFlowApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"" | TaskStatus>("");
  const [priorityFilter, setPriorityFilter] = useState<"" | TaskPriority>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>({ ...emptyForm });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const DESKTOP_BREAKPOINT = 1024;

  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= DESKTOP_BREAKPOINT,
  );

const [isCollapsed, setIsCollapsed] = useState(false);
const currentPath = window.location.pathname;

  const [toast, setToast] = useState<{
    message: string;
    variant: ToastVariant;
  } | null>(null);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

useEffect(() => {
  const mediaQuery = window.matchMedia(
    `(min-width: ${DESKTOP_BREAKPOINT}px)`,
  );

  const handleScreenChange = (event: MediaQueryListEvent) => {
    setIsDesktop(event.matches);
    setIsCollapsed(false);
  };

  setIsDesktop(mediaQuery.matches);
  mediaQuery.addEventListener("change", handleScreenChange);

  return () => {
    mediaQuery.removeEventListener("change", handleScreenChange);
  };
}, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getTasks({
        status: filter || undefined,
        priority: priorityFilter || undefined,
        search,
        page,
      });

      setTasks(result.data);
      setPage(result.meta.current_page);
      setLastPage(result.meta.last_page);
      setTotalTasks(result.meta.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter, priorityFilter, search, page]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const completedCount = tasks.filter(
    (task) => task.status === "done",
  ).length;

  const inProgressCount = tasks.filter(
    (task) => task.status === "in_progress",
  ).length;

  function openCreateForm() {
    setEditingTask(null);
    setForm({ ...emptyForm });
    setError("");
    setShowForm(true);
  }

  async function openEditForm(task: Task) {
    setError("");


    try {
      const latestTask = await getTask(task.id);
      setEditingTask(latestTask);
      setForm(taskToForm(latestTask));
      setShowForm(true);
      setSelectedTask(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load this task.",
      );
    }
  }

  async function viewTask(task: Task) {
    setDetailsLoading(true);
    setError("");
    setSelectedTask(null);

    try {
      const latestTask = await getTask(task.id);
      setSelectedTask(latestTask);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load task details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const title = form.title.trim();

    if (title.length < 3 || title.length > 120) {
      setError("The title must be between 3 and 120 characters.");
      return;
    }

    if (form.description.length > 1000) {
      setError("The description cannot exceed 1,000 characters.");
      return;
    }

    setSaving(true);

    try {
      const input = toTaskInput(form);

      if (editingTask) {
        await updateTask(editingTask.id, input);
        setToast({
          variant: "success",
          message: "Your new task has been updated successfully.",
        });
      } else {
        await createTask(input);
        setPage(1);
        setToast({
          variant: "success",
          message: "Your new task has been created successfully.",
        });
      }

      setShowForm(false);
      setEditingTask(null);
      setForm({ ...emptyForm });

      // Refresh from Laravel so the database remains the source of truth.
      if (page === 1 || !editingTask) {
        await loadTasks();
      } else {
        setPage(1);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save this task.",
      );
      setToast({
        variant: "error",
        message: "The operation failed. Please try again.",
      });

    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    setError("");

    try {
      await updateTask(task.id, { status });
      setToast({
        variant: "success",
        message: `${task.title} status updated.`,
      });
      await loadTasks();

      if (selectedTask?.id === task.id) {
        setSelectedTask(await getTask(task.id));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update task status.",
      );
      await loadTasks();
    }
  }

  async function removeTask(task: Task) {
    const confirmed = window.confirm(
      `Delete "${task.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await deleteTask(task.id);
      setToast({
        variant: "success",
        message: "Task Deleted successfully",
      });

      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }

      // If the last item on a page was deleted, return to the previous page.
      if (tasks.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadTasks();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete this task.",
      );
      setToast({
        variant: "error",
        message: "Task Deletion failed",
      });
    }
  }

  function clearFilters() {
    setFilter("");
    setPriorityFilter("");
    setSearch("");
    setPage(1);
  }

  function updateForm<K extends keyof TaskFormState>(
    field: K,
    value: TaskFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className={`app-shell ${isCollapsed ? "main-panel-toggle" : ""}`}>
      {toast && (
        <Toast
          key={`${toast.variant}-${toast.message}`}
          message={toast.message}
          variant={toast.variant}
          onClose={dismissToast}
        />
      )}
          <button
            type="button"
            className={`sidebar-toggle ${isCollapsed ? "sidebar-toggle-collapsed" : ""} ${showForm ? "showForm-active" : ""}`} 
            title={isCollapsed && isDesktop ? "Tasks" : undefined}
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
            aria-expanded={!isCollapsed}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>
          
      <aside className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""}`}>
        <div>
          <div className="sidebar-brand">
            <a className="brand" href="#dashboard" aria-label="TaskFlow home">
              <span className="brand-mark">T</span>
              {!isCollapsed && <span>TaskFlow</span>}
            </a> 
          </div>
        </div>

        {!isCollapsed && <p className="sidebar-label">WORKSPACE</p>}

        <nav className="sidebar-nav" aria-label="Main navigation">
          <a
            className={`nav-item ${currentPath === "/dashboard" ? "active" : ""}`}
            href="/dashboard"
            aria-current={currentPath === "/dashboard" ? "page" : undefined}
          >
            <span aria-hidden="true">▦</span>
            {!isCollapsed && "Overview"}
          </a>

          <a
            className={`nav-item ${currentPath === "/tasks" ? "active" : ""}`}
            href="/tasks"
            aria-current={currentPath === "/tasks" ? "page" : undefined}
          >
            <span aria-hidden="true">☷</span>
            {!isCollapsed && "My tasks"}
          </a>
        </nav>

        <div className="sidebar-bottom">
          <span className="avatar" aria-hidden="true">U</span>
          
          {!isCollapsed  && (
            <div>
              <strong>Workspace member</strong>
              <span className="muted">Personal workspace</span>
            </div>
          )}
        </div>
      </aside>

      <section className={`main-panel ${isCollapsed ? "main-panel-increase" : ""} `} id="dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">WORKSPACE / OVERVIEW</span>
            <h1>My workspace</h1>
          </div>

          <button
            className="button button-primary"
            type="button"
            onClick={openCreateForm}
          >
            <span aria-hidden="true">＋</span> New task
          </button>
        </header>

        <section className="welcome-panel">
          <div>
            <span className="welcome-tag">YOUR TASK SPACE</span>
            <h2>Make progress, one task at a time.</h2>
            <p>
              Organize your priorities and keep your work moving forward.
            </p>
          </div>
          <div className="welcome-symbol" aria-hidden="true">✓</div>
        </section>

        <section className="stats-grid" aria-label="Task statistics">
          <article className="stat-card">
            <span className="stat-icon purple" aria-hidden="true">▤</span>
            <span className="stat-label">Total matching tasks</span>
            <strong>{totalTasks}</strong>
            <span className="stat-caption">Matching your current filters</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon amber" aria-hidden="true">◷</span>
            <span className="stat-label">In progress on this page</span>
            <strong>{inProgressCount}</strong>
            <span className="stat-caption">Currently being worked on</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon green" aria-hidden="true">✓</span>
            <span className="stat-label">Completed on this page</span>
            <strong>{completedCount}</strong>
            <span className="stat-caption">Tasks finished</span>
          </article>
        </section>

        {error && (
          <div className="feedback-error" role="alert">
            <span>{error}</span>
            <button
              className="button button-quiet"
              type="button"
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        )}

{showForm && (
          <div
            className="task-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) {
                setShowForm(false);
                setEditingTask(null);
              }
            }}
          >
            <section
              className="task-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-modal-title"
            >
              <header className="task-modal-header">
                <div className="task-modal-heading">
                  <span className="task-modal-icon" aria-hidden="true">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="4" width="16" height="16" rx="3" />
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                  </span>

                  <div>
                    <h2 id="task-modal-title">
                      {editingTask ? "Edit task" : "Create a new task"}
                    </h2>
                    <p>
                      {editingTask
                        ? "Make changes to your task details."
                        : "Plan your next move. Great work starts with a clear task."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="task-modal-close"
                  aria-label="Close task form"
                  disabled={saving}
                  onClick={() => {
                    setShowForm(false);
                    setEditingTask(null);
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="m18 6-12 12M6 6l12 12" />
                  </svg>
                </button>
              </header>

              <div className="task-modal-body">
                <form className="task-form" onSubmit={submitTask}>
                  <div className="section-heading">
                    <div>
                      <h2>{editingTask ? "Edit task" : "Create a task"}</h2>
                      <p>
                        {editingTask
                          ? "Update the details and save your changes."
                          : "Add something you want to accomplish."}
                      </p>
                    </div>
                    <button
                      className="button button-quiet"
                      type="button"                                                                
                      onClick={() => {
                        setShowForm(false);
                        setEditingTask(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  <label>
                    Task title
                    <input
                      value={form.title}
                      onChange={(event) => updateForm("title", event.target.value)}
                      placeholder="What needs to get done?"
                      minLength={3}
                      maxLength={120}
                      required                                                 
                      aria-describedby="task-title-help"
                    />
                    <span id="task-title-help" className="muted">
                      Required; 3–120 characters.
                    </span>
                  </label>

                  <label>
                    Description
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      placeholder="Add some details (optional)"
                      maxLength={1000}
                      rows={3}
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm("status", event.target.value as TaskStatus)
                      }
                    >
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Completed</option>
                    </select>
                  </label>

                  <label>
                    Priority
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        updateForm("priority", event.target.value as TaskPriority)
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <label>
                    Due date
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(event) =>
                        updateForm("due_date", event.target.value)
                      }
                    />
                  </label>

                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingTask
                        ? "Save changes"
                        : "Create task"}
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}


        {selectedTask && (
          <section className="task-form" aria-labelledby="task-details-heading">
            <div className="section-heading">
              <div>
                <h2 id="task-details-heading">Task details</h2>
                <p>Full details retrieved from the API.</p>
              </div>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => setSelectedTask(null)}
              >
                Close
              </button>
            </div>

            <h3>{selectedTask.title}</h3>
            <p>{selectedTask.description || "No description provided."}</p>
            <p>Status: {statusLabels[selectedTask.status]}</p>
            <p>Priority: {selectedTask.priority}</p>
            <p>Due date: {selectedTask.due_date || "Not set"}</p>
            <p>
              Created:{" "}
              {selectedTask.created_at
                ? new Date(selectedTask.created_at).toLocaleString()
                : "Unavailable"}
            </p>

            <div className="task-actions">
              <button
                className="button button-primary"
                type="button"
                onClick={() => void openEditForm(selectedTask)}
              >
                Edit task
              </button>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => void removeTask(selectedTask)}
              >
                Delete task
              </button>
            </div>
          </section>
        )}

        {detailsLoading && (
          <p role="status">Loading task details...</p>
        )}

        <section className="tasks-section" id="tasks">
          <div className="section-heading">
            <div>
              <h2>Tasks</h2>
              <p>Keep track of what matters.</p>
            </div>
            <span className="task-count">
              {totalTasks} matching tasks
            </span>
          </div>

          <div className="task-toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search tasks..."
                aria-label="Search tasks"
              />
            </label>

            <label className="filter-control">
              <span className="sr-only">Filter by status</span>
              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value as "" | TaskStatus);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Completed</option>
              </select>
            </label>

            <label className="filter-control">
              <span className="sr-only">Filter by priority</span>
              <select
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(
                    event.target.value as "" | TaskPriority,
                  );
                  setPage(1);
                }}
              >
                <option value="">All priorities</option>
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
            </label>

            <button
              className="button button-quiet"
              type="button"
              onClick={clearFilters}
              disabled={!filter && !priorityFilter && !search}
            >
              Clear filters
            </button>
          </div>

          {loading ? (
            <p role="status" aria-live="polite">Loading tasks...</p>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <div className="task-main">
                    <span
                      className={`status-dot status-${task.status}`}
                      aria-hidden="true"
                    />
                    <div className="task-copy">
                      <h3>{task.title}</h3>
                      <p>{task.description || "No description provided."}</p>
                      <div className="task-meta">
                        <span className={`priority priority-${task.priority}`}>
                          {task.priority} priority
                        </span>
                        {task.due_date && (
                          <span className="due-date">
                            Due {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      className="button button-quiet"
                      type="button"
                      onClick={() => void viewTask(task)}
                    >
                      View
                    </button>

                    <button
                      className="button button-quiet"
                      type="button"
                      onClick={() => void openEditForm(task)}
                    >
                      Edit
                    </button>

                    <label>
                      <span className="sr-only">
                        Status for {task.title}
                      </span>
                      <select
                        value={task.status}
                        onChange={(event) =>
                          void changeStatus(
                            task,
                            event.target.value as TaskStatus,
                          )
                        }
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => void removeTask(task)}
                      aria-label={`Delete ${task.title}`}
                      title="Delete task"
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))}

              {tasks.length === 0 && (
                <div className="empty-state">
                  <span aria-hidden="true">⌕</span>
                  <h3>No tasks found</h3>
                  <p>
                    Try changing your search or filters, or create a new task.
                  </p>
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={openCreateForm}
                  >
                    Create task
                  </button>
                </div>
              )}
            </div>
          )}

          <nav className="pagination" aria-label="Task pages">
            <button
              className="button button-quiet"
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span aria-live="polite">
              Page {page} of {lastPage}
            </span>
            <button
              className="button button-quiet"
              type="button"
              disabled={page >= lastPage || loading}
              onClick={() =>
                setPage((current) => Math.min(lastPage, current + 1))
              }
            >
              Next
            </button>
          </nav>
        </section>

        <footer className="app-footer">
          TaskFlow <span>·</span> Organize your work with clarity.
        </footer>
      </section>
    </main>
  );
}

export default TaskFlowApp;
