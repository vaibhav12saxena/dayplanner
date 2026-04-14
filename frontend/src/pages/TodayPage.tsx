import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import SortableTaskList from "@/components/SortableTaskList";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import OverflowDialog from "@/components/OverflowDialog";
import type { Task, TaskPriority, OverflowInfo } from "@/types";
import { getTasks, createTask, moveTask, deleteTask, createApproval } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";

export default function TodayPage() {
  const { user } = useAuth();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overflowData, setOverflowData] = useState<{ taskId: number; target: string; info: OverflowInfo } | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const [today, inProgress] = await Promise.all([getTasks("today"), getTasks("in_progress")]);
      setTodayTasks(today);
      setInProgressTasks(inProgress);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreate = async (data: { title: string; description: string; priority: TaskPriority; allocated_hours: number; project: string; due_date: string }) => {
    try {
      await createTask({ ...data, status: "today" });
      fetchTasks();
    } catch (err) {
      const axErr = err as AxiosError<{ detail: { type: string; overflow: OverflowInfo } }>;
      if (axErr.response?.status === 409 && axErr.response.data?.detail?.type === "overflow") {
        alert(axErr.response.data.detail.overflow.message);
      }
    }
  };

  const handleMove = async (id: number, target: string, force = false) => {
    try {
      await moveTask(id, target, force);
      fetchTasks();
    } catch (err) {
      const axErr = err as AxiosError<{ detail: { type: string; overflow: OverflowInfo } }>;
      if (axErr.response?.status === 409 && axErr.response.data?.detail?.type === "overflow") {
        setOverflowData({ taskId: id, target, info: axErr.response.data.detail.overflow });
      }
    }
  };

  const handleOverflowConfirm = async () => {
    if (!overflowData) return;
    await handleMove(overflowData.taskId, overflowData.target, true);
    setOverflowData(null);
  };

  const handleDelete = async (id: number) => {
    await deleteTask(id);
    fetchTasks();
  };

  const handleRequestApproval = async (id: number, target: "today" | "tomorrow") => {
    await createApproval(id, target);
    fetchTasks();
  };

  const totalHoursAllocated = [...todayTasks, ...inProgressTasks].reduce((sum, t) => sum + t.allocated_hours, 0);
  const totalHoursSpent = [...todayTasks, ...inProgressTasks].reduce((sum, t) => sum + t.hours_spent, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Today's Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {todayTasks.length + inProgressTasks.length} tasks · {totalHoursAllocated}h / {user?.daily_work_hours ?? 8}h allocated · {totalHoursSpent}h spent
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Task
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {inProgressTasks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">In Progress</h3>
              <SortableTaskList tasks={inProgressTasks} onMove={handleMove} onDelete={handleDelete} onRequestApproval={handleRequestApproval} onUpdate={fetchTasks} />
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">To Do</h3>
            {todayTasks.length === 0 && inProgressTasks.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">No tasks for today. Add one or approve from backlog.</p>
              </div>
            ) : (
              <SortableTaskList tasks={todayTasks} onMove={handleMove} onDelete={handleDelete} onRequestApproval={handleRequestApproval} onUpdate={fetchTasks} />
            )}
          </div>
        </>
      )}

      <CreateTaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={handleCreate} />
      <OverflowDialog
        open={!!overflowData}
        overflow={overflowData?.info ?? null}
        onConfirm={handleOverflowConfirm}
        onCancel={() => setOverflowData(null)}
      />
    </div>
  );
}
