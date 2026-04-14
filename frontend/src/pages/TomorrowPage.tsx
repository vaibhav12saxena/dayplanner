import { useEffect, useState, useCallback } from "react";
import TaskCard from "@/components/TaskCard";
import SortableTaskList from "@/components/SortableTaskList";
import OverflowDialog from "@/components/OverflowDialog";
import type { Task, OverflowInfo } from "@/types";
import { getTasks, moveTask, deleteTask } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";

export default function TomorrowPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [overflowData, setOverflowData] = useState<{ taskId: number; target: string; info: OverflowInfo } | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getTasks("tomorrow");
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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

  const handleDelete = async (id: number) => {
    await deleteTask(id);
    fetchTasks();
  };

  const totalHoursAllocated = tasks.reduce((sum, t) => sum + t.allocated_hours, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Tomorrow's Tasks</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {tasks.length} tasks · {totalHoursAllocated}h / {user?.daily_work_hours ?? 8}h allocated
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No tasks scheduled for tomorrow.</p>
        </div>
      ) : (
        <SortableTaskList tasks={tasks} onMove={handleMove} onDelete={handleDelete} onUpdate={fetchTasks} />
      )}

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
