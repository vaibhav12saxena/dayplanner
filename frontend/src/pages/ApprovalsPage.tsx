import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import { Check, X, Clock, Calendar, User } from "lucide-react";
import type { ApprovalRequest } from "@/types";
import { getApprovals, resolveApproval } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<ApprovalRequest[]>([]);
  const [resolved, setResolved] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryDates, setDeliveryDates] = useState<Record<number, string>>({});
  const [dueDates, setDueDates] = useState<Record<number, string>>({});

  const fetchApprovals = useCallback(async () => {
    try {
      const [pendingData, approvedData, rejectedData] = await Promise.all([
        getApprovals("pending"),
        getApprovals("approved"),
        getApprovals("rejected"),
      ]);
      setPending(pendingData);
      setResolved([...approvedData, ...rejectedData].slice(0, 20));
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleResolve = async (id: number, action: "approved" | "rejected") => {
    const date = deliveryDates[id] || undefined;
    const due = dueDates[id] || undefined;
    await resolveApproval(id, action, date, due);
    fetchApprovals();
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Approval Queue</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Approve or reject requests to move tasks to today/tomorrow
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Pending ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">No pending approvals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => {
              const isMyTask = req.task?.assignee_id === user?.id;
              return (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {req.task && <PriorityBadge priority={req.task.priority} />}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-100 text-purple-800 border-purple-200">
                            → {req.requested_target}
                          </span>
                          {req.requested_by && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {req.requested_by.full_name || req.requested_by.username}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm">{req.task?.title || `Task #${req.task_id}`}</p>
                        {req.task?.creator && req.task.creator.id !== user?.id && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Created by {req.task.creator.full_name || req.task.creator.username}
                          </p>
                        )}
                        {req.note && <p className="text-xs text-muted-foreground mt-1">{req.note}</p>}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {req.task?.allocated_hours}h allocated
                        </div>
                      </div>
                      {isMyTask && (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              type="date"
                              value={deliveryDates[req.id] || ""}
                              onChange={(e) => setDeliveryDates((prev) => ({ ...prev, [req.id]: e.target.value }))}
                              className="border border-border rounded-md px-2 py-1 text-xs bg-background"
                              placeholder="My delivery date"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              type="date"
                              value={dueDates[req.id] ?? req.task?.due_date ?? ""}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={(e) => setDueDates((prev) => ({ ...prev, [req.id]: e.target.value }))}
                              className="border border-border rounded-md px-2 py-1 text-xs bg-background"
                              placeholder="Modify expected by"
                            />
                            <span className="text-[10px] text-muted-foreground">expected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleResolve(req.id, "approved")}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleResolve(req.id, "rejected")}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      )}
                      {!isMyTask && (
                        <span className="text-xs text-muted-foreground italic">Waiting for approval</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Recently Resolved
          </h3>
          <div className="space-y-2">
            {resolved.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card text-sm">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                    req.status === "approved"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-red-100 text-red-800 border-red-200"
                  }`}
                >
                  {req.status}
                </span>
                <span className="flex-1">{req.task?.title || `Task #${req.task_id}`}</span>
                {req.delivery_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {req.delivery_date}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">→ {req.requested_target}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
