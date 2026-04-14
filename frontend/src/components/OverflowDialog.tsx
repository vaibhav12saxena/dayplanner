import { Button } from "@/components/ui/Button";
import { AlertTriangle, X } from "lucide-react";
import type { OverflowInfo } from "@/types";

interface OverflowDialogProps {
  open: boolean;
  overflow: OverflowInfo | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function OverflowDialog({ open, overflow, onConfirm, onCancel }: OverflowDialogProps) {
  if (!open || !overflow) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Daily Capacity Exceeded</h2>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm">{overflow.message}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Daily limit: <strong className="text-foreground">{overflow.daily_limit}h</strong></span>
            <span>New total: <strong className="text-destructive">{overflow.current_total_hours}h</strong></span>
          </div>
          {overflow.overflow_task_title && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <span className="text-muted-foreground">Will be bumped: </span>
              <strong>{overflow.overflow_task_title}</strong>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm & Push</Button>
        </div>
      </div>
    </div>
  );
}
