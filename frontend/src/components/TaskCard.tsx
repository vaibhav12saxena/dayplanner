import { useState, useRef, useEffect } from "react";
import type { Task, TaskPriority, Comment } from "@/types";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Clock, ArrowRight, ArrowLeft, Trash2, Play, CheckCircle2, User, Calendar, CalendarClock, MessageSquare, Check, X, Send, Ban, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTask, getComments, addComment, updateDependencies, searchTasks } from "@/api/client";

interface TaskCardProps {
  task: Task;
  onMove?: (id: number, target: string) => void;
  onDelete?: (id: number) => void;
  onRequestApproval?: (id: number, target: "today" | "tomorrow") => void;
  onUpdate?: () => void;
  showActions?: boolean;
}

export default function TaskCard({ task, onMove, onDelete, onRequestApproval: _onRequestApproval, onUpdate, showActions = true }: TaskCardProps) {
  const hoursProgress = task.allocated_hours > 0 ? Math.min((task.hours_spent / task.allocated_hours) * 100, 100) : 0;
  const isOvertime = task.hours_spent > task.allocated_hours;

  const [editing, setEditing] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editHours, setEditHours] = useState(task.allocated_hours);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editTitle, setEditTitle] = useState(task.title);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (field: string) => {
    const updates: Record<string, unknown> = {};
    if (field === "priority") updates.priority = editPriority;
    if (field === "hours") updates.allocated_hours = editHours;
    if (field === "description") updates.description = editDesc;
    if (field === "title") updates.title = editTitle;
    try {
      await updateTask(task.id, updates as Partial<Task>);
      setEditing(null);
      onUpdate?.();
    } catch { /* ignore */ }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const data = await getComments(task.id);
      setComments(data);
    } catch { /* ignore */ }
    setLoadingComments(false);
  };

  const handleToggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(task.id, newComment.trim());
      setNewComment("");
      loadComments();
    } catch { /* ignore */ }
  };

  const [showDeps, setShowDeps] = useState(false);
  const [depSearch, setDepSearch] = useState("");
  const [depResults, setDepResults] = useState<Task[]>([]);
  const [currentDeps, setCurrentDeps] = useState<number[]>(task.blocked_by?.map((d) => d.id) || []);

  useEffect(() => {
    if (depSearch.length < 2) { setDepResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const results = await searchTasks(depSearch);
        setDepResults(results.filter((r) => r.id !== task.id && !currentDeps.includes(r.id)));
      } catch { setDepResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [depSearch, task.id, currentDeps]);

  const handleAddDep = async (depId: number) => {
    const newDeps = [...currentDeps, depId];
    setCurrentDeps(newDeps);
    setDepSearch("");
    setDepResults([]);
    try {
      await updateDependencies(task.id, newDeps);
      onUpdate?.();
    } catch { setCurrentDeps(currentDeps); }
  };

  const handleRemoveDep = async (depId: number) => {
    const newDeps = currentDeps.filter((d) => d !== depId);
    setCurrentDeps(newDeps);
    try {
      await updateDependencies(task.id, newDeps);
      onUpdate?.();
    } catch { setCurrentDeps(currentDeps); }
  };

  useEffect(() => {
    if (showComments && commentInputRef.current) commentInputRef.current.focus();
  }, [showComments]);

  return (
    <div className="group border border-border rounded-lg bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {editing === "priority" ? (
              <div className="flex items-center gap-1">
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                  className="text-xs border border-border rounded px-1 py-0.5 bg-background"
                  autoFocus
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button onClick={() => handleSave("priority")} className="text-success cursor-pointer"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => setEditing(null)} className="text-destructive cursor-pointer"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <span onDoubleClick={() => { setEditPriority(task.priority); setEditing("priority"); }} title="Double-click to edit">
                <PriorityBadge priority={task.priority} />
              </span>
            )}
            <StatusBadge status={task.status} />
            {task.project && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{task.project}</span>
            )}
            {task.tags?.map((tag) => (
              <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: tag.color, color: tag.color }}>
                {tag.name}
              </span>
            ))}
          </div>
          {editing === "title" ? (
            <div className="flex items-center gap-1">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="font-medium text-sm border border-border rounded px-1 py-0.5 bg-background flex-1"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave("title"); if (e.key === "Escape") setEditing(null); }}
              />
              <button onClick={() => handleSave("title")} className="text-success cursor-pointer"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={() => setEditing(null)} className="text-destructive cursor-pointer"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <h4 className="font-medium text-sm truncate cursor-pointer" onDoubleClick={() => { setEditTitle(task.title); setEditing("title"); }} title="Double-click to edit">
              {task.title}
            </h4>
          )}
          {editing === "description" ? (
            <div className="mt-1 flex items-start gap-1">
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="text-xs border border-border rounded px-1 py-0.5 bg-background flex-1 min-h-[48px]"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
              />
              <button onClick={() => handleSave("description")} className="text-success cursor-pointer"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={() => setEditing(null)} className="text-destructive cursor-pointer"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            task.description ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 cursor-pointer" onDoubleClick={() => { setEditDesc(task.description); setEditing("description"); }} title="Double-click to edit">
                {task.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/50 mt-1 italic cursor-pointer" onDoubleClick={() => { setEditDesc(""); setEditing("description"); }}>
                Double-click to add description
              </p>
            )
          )}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {task.creator && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> by {task.creator.full_name || task.creator.username}
              </span>
            )}
            {task.due_date && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> Expected: {task.due_date}
              </span>
            )}
            {task.delivery_date && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Delivery: {task.delivery_date}
              </span>
            )}
          </div>
          {task.blocked_by && task.blocked_by.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5">
                <Ban className="h-3 w-3" /> Blocked by:
              </span>
              {task.blocked_by.map((dep) => (
                <span key={dep.id} className={cn("text-[10px] px-1.5 py-0.5 rounded border", dep.status === "done" ? "border-success/40 text-success line-through" : "border-destructive/40 text-destructive")}>
                  {dep.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        {editing === "hours" ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="number"
              value={editHours}
              onChange={(e) => setEditHours(Number(e.target.value))}
              className="w-16 text-xs border border-border rounded px-1 py-0.5 bg-background"
              min={0.5}
              step={0.5}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave("hours"); if (e.key === "Escape") setEditing(null); }}
            />
            <span className="text-xs text-muted-foreground">h</span>
            <button onClick={() => handleSave("hours")} className="text-success cursor-pointer"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => setEditing(null)} className="text-destructive cursor-pointer"><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <div className="flex-1 cursor-pointer" onDoubleClick={() => { setEditHours(task.allocated_hours); setEditing("hours"); }} title="Double-click to edit hours">
            <div className="flex justify-between text-xs mb-1">
              <span className={cn(isOvertime && "text-destructive font-medium")}>
                {task.hours_spent}h / {task.allocated_hours}h
              </span>
              <span className="text-muted-foreground">{Math.round(hoursProgress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", isOvertime ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.min(hoursProgress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {showActions && (
        <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.status === "backlog" && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onMove?.(task.id, "today")} title="Move to Today">
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Today
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onMove?.(task.id, "tomorrow")} title="Move to Tomorrow">
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Tomorrow
              </Button>
            </>
          )}
          {task.status === "today" && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onMove?.(task.id, "in_progress")} title="Start Working">
                <Play className="h-3.5 w-3.5 mr-1" /> Start
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onMove?.(task.id, "tomorrow")} title="Move to Tomorrow">
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Tomorrow
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onMove?.(task.id, "backlog")} title="Back to Backlog">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Backlog
              </Button>
            </>
          )}
          {task.status === "tomorrow" && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onMove?.(task.id, "today")} title="Move to Today">
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Today
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onMove?.(task.id, "backlog")} title="Back to Backlog">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Backlog
              </Button>
            </>
          )}
          {task.status === "in_progress" && (
            <Button size="sm" variant="ghost" onClick={() => onMove?.(task.id, "done")} title="Mark Done">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleToggleComments} title="Comments">
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDeps(!showDeps)} title="Dependencies">
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => onDelete?.(task.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {showDeps && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Blocked By</p>
          {task.blocked_by && task.blocked_by.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.blocked_by.map((dep) => (
                <span key={dep.id} className="text-[11px] px-2 py-0.5 rounded border border-border flex items-center gap-1 bg-muted">
                  {dep.title}
                  <button onClick={() => handleRemoveDep(dep.id)} className="text-destructive cursor-pointer hover:text-destructive/80"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <input
              type="text"
              value={depSearch}
              onChange={(e) => setDepSearch(e.target.value)}
              placeholder="Search tasks to add as blocker..."
              className="w-full text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {depResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-32 overflow-auto">
                {depResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleAddDep(r.id)}
                    className="w-full text-left px-2 py-1.5 hover:bg-accent text-xs cursor-pointer border-b border-border last:border-b-0"
                  >
                    <span className="font-medium">{r.title}</span>
                    <span className="text-muted-foreground ml-1">({r.status})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showComments && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Comments</p>
          {loadingComments ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.length === 0 && <p className="text-xs text-muted-foreground italic">No comments yet</p>}
              {comments.map((c) => (
                <div key={c.id} className="text-xs">
                  <span className="font-medium">{c.user?.full_name || c.user?.username || "Unknown"}</span>
                  <span className="text-muted-foreground ml-1">{new Date(c.created_at).toLocaleString()}</span>
                  <p className="mt-0.5">{c.content}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 mt-2">
            <input
              ref={commentInputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
            />
            <button onClick={handleAddComment} className="text-primary cursor-pointer" title="Send">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
