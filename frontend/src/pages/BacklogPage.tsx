import { useEffect, useState, useCallback } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import TaskCard from "@/components/TaskCard";
import SortableTaskList from "@/components/SortableTaskList";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import OverflowDialog from "@/components/OverflowDialog";
import type { Task, TaskPriority, OverflowInfo } from "@/types";
import { getTasks, createTask, deleteTask, createApproval, moveTask } from "@/api/client";
import { AxiosError } from "axios";

export default function BacklogPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [overflowData, setOverflowData] = useState<{ taskId: number; target: string; info: OverflowInfo } | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getTasks("backlog");
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch backlog:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreate = async (data: { title: string; description: string; priority: TaskPriority; allocated_hours: number; project: string; due_date: string }) => {
    await createTask({ ...data, status: "backlog" });
    fetchTasks();
  };

  const handleDelete = async (id: number) => {
    await deleteTask(id);
    fetchTasks();
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

  const handleRequestApproval = async (id: number, target: "today" | "tomorrow") => {
    await createApproval(id, target);
  };

  const filteredTasks = filterPriority === "all" ? tasks : tasks.filter((t) => t.priority === filterPriority);

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedTasks = [...filteredTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Backlog</h2>
          <p className="text-sm text-muted-foreground mt-1">{tasks.length} tasks waiting to be scheduled</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Task
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border border-border rounded-md px-2 py-1 text-sm bg-background"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : sortedTasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Backlog is empty. Great job!</p>
        </div>
      ) : (
        <SortableTaskList tasks={sortedTasks} onMove={handleMove} onDelete={handleDelete} onRequestApproval={handleRequestApproval} onUpdate={fetchTasks} />
      )}

      <CreateTaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={handleCreate} />
      <OverflowDialog
        open={!!overflowData}
        overflow={overflowData?.info ?? null}
        onConfirm={async () => {
          if (overflowData) await handleMove(overflowData.taskId, overflowData.target, true);
          setOverflowData(null);
        }}
        onCancel={() => setOverflowData(null)}
      />
    </div>
  );
}
