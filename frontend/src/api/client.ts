import axios from "axios";
import type { Task, ApprovalRequest, DailySummary, User, MoveResponse, UserBrief, Notification as NotifType, Comment, Tag, AnalyticsData, RecurringRule } from "@/types";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

// Auth
export const register = (data: { email: string; username: string; password: string; full_name?: string }) =>
  api.post<User>("/auth/register", data).then((r) => r.data);

export const login = (username: string, password: string) => {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  return api.post<{ access_token: string }>("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).then((r) => r.data);
};

export const getMe = () =>
  api.get<User>("/auth/me").then((r) => r.data);

export const updateMe = (data: { full_name?: string; daily_work_hours?: number }) =>
  api.patch<User>("/auth/me", data).then((r) => r.data);

export const searchUsers = (q?: string) =>
  api.get<UserBrief[]>("/auth/users", { params: q ? { q } : {} }).then((r) => r.data);

// Tasks
export const getTasks = (status?: string, view?: string) =>
  api.get<Task[]>("/tasks", { params: { ...(status ? { status } : {}), ...(view ? { view } : {}) } }).then((r) => r.data);

export const getTask = (id: number) =>
  api.get<Task>(`/tasks/${id}`).then((r) => r.data);

export const getUserTasks = (userId: number, status?: string) =>
  api.get<Task[]>(`/tasks/user/${userId}`, { params: status ? { status } : {} }).then((r) => r.data);

export const createTask = (data: Partial<Task> & { assignee_id?: number }) =>
  api.post<Task>("/tasks", data).then((r) => r.data);

export const updateTask = (id: number, data: Partial<Task>) =>
  api.patch<Task>(`/tasks/${id}`, data).then((r) => r.data);

export const deleteTask = (id: number) =>
  api.delete(`/tasks/${id}`).then((r) => r.data);

export const moveTask = (id: number, target: string, force: boolean = false) =>
  api.post<MoveResponse>(`/tasks/${id}/move`, { target, force }).then((r) => r.data);

// Approvals
export const getApprovals = (status?: string) =>
  api.get<ApprovalRequest[]>("/approvals", { params: status ? { status } : {} }).then((r) => r.data);

export const createApproval = (taskId: number, target: "today" | "tomorrow", note?: string) =>
  api.post<ApprovalRequest>("/approvals", { task_id: taskId, requested_target: target, note: note || "" }).then((r) => r.data);

export const resolveApproval = (id: number, action: "approved" | "rejected", deliveryDate?: string, dueDate?: string) =>
  api.post<ApprovalRequest>(`/approvals/${id}/resolve`, { status: action, delivery_date: deliveryDate || null, due_date: dueDate || null }).then((r) => r.data);

// Notifications
export const getNotifications = () =>
  api.get<NotifType[]>("/notifications").then((r) => r.data);

export const getUnreadCount = () =>
  api.get<{ count: number }>("/notifications/unread-count").then((r) => r.data);

export const markNotificationRead = (id: number) =>
  api.post<NotifType>(`/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsRead = () =>
  api.post("/notifications/read-all").then((r) => r.data);

// Summary
export const getDailySummary = (date: string) =>
  api.get<DailySummary>(`/summary/${date}`).then((r) => r.data);

// Comments
export const getComments = (taskId: number) =>
  api.get<Comment[]>(`/tasks/${taskId}/comments`).then((r) => r.data);

export const addComment = (taskId: number, content: string) =>
  api.post<Comment>(`/tasks/${taskId}/comments`, { content }).then((r) => r.data);

// Tags
export const getTags = () =>
  api.get<Tag[]>("/tasks/meta/tags").then((r) => r.data);

export const createTag = (name: string, color?: string) =>
  api.post<Tag>("/tasks/meta/tags", { name, color: color || "#6b7280" }).then((r) => r.data);

// Search
export const searchTasks = (q: string) =>
  api.get<Task[]>("/tasks/meta/search", { params: { q } }).then((r) => r.data);

// Analytics
export const getAnalytics = () =>
  api.get<AnalyticsData>("/analytics").then((r) => r.data);

// Recurring
export const getRecurringRules = () =>
  api.get<RecurringRule[]>("/recurring").then((r) => r.data);

export const createRecurringRule = (data: { title: string; description?: string; priority?: string; allocated_hours?: number; project?: string; frequency: string }) =>
  api.post<RecurringRule>("/recurring", data).then((r) => r.data);

export const deleteRecurringRule = (id: number) =>
  api.delete(`/recurring/${id}`).then((r) => r.data);

export const toggleRecurringRule = (id: number) =>
  api.patch<RecurringRule>(`/recurring/${id}/toggle`).then((r) => r.data);

export const generateRecurringTasks = () =>
  api.post<{ created: number }>("/recurring/generate").then((r) => r.data);

// Dependencies
export const updateDependencies = (taskId: number, blockedByIds: number[]) =>
  api.put<Task>(`/tasks/${taskId}/dependencies`, { blocked_by_ids: blockedByIds }).then((r) => r.data);

// Reorder
export const reorderTasks = (taskIds: number[]) =>
  api.post("/tasks/meta/reorder", { task_ids: taskIds }).then((r) => r.data);

export default api;
