import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import TaskCard from "@/components/TaskCard";
import { CheckCircle2, Clock, Target } from "lucide-react";
import type { DailySummary } from "@/types";
import { getDailySummary } from "@/api/client";
import { format, subDays } from "date-fns";

export default function YesterdayPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const data = await getDailySummary(yesterday);
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Yesterday's Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {summary?.date ? format(new Date(summary.date + "T00:00:00"), "EEEE, MMMM d, yyyy") : "No data"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Tasks Done
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.tasks_completed.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Hours Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.total_hours_spent ?? 0}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" /> Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summary && summary.total_hours_allocated > 0
                ? Math.round((summary.total_hours_spent / summary.total_hours_allocated) * 100)
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      {summary && summary.tasks_completed.length > 0 ? (
        <div className="space-y-3">
          {summary.tasks_completed.map((task) => (
            <TaskCard key={task.id} task={task} showActions={false} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No tasks completed yesterday</p>
        </div>
      )}
    </div>
  );
}
