import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Clock, Calendar, User } from "lucide-react";
import type { Task, TaskPriority, UserBrief } from "@/types";
import { getTasks, createTask, searchUsers } from "@/api/client";

export default function AssignedByMePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // assign form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [allocatedHours, setAllocatedHours] = useState(2);
  const [project, setProject] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeResults, setAssigneeResults] = useState<UserBrief[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<UserBrief | null>(null);
  const [dueDate, setDueDate] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const all = await getTasks(undefined, "created");
      const data = all.filter((t) => t.assignee_id !== t.creator_id);
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (assigneeSearch.length < 2) { setAssigneeResults([]); return; }
    const timeout = setTimeout(async () => {
      const results = await searchUsers(assigneeSearch);
      setAssigneeResults(results);
    }, 300);
    return () => clearTimeout(timeout);
  }, [assigneeSearch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignee) return;
    await createTask({
      title, description, priority,
      allocated_hours: allocatedHours,
      project,
      assignee_id: selectedAssignee.id,
      due_date: dueDate,
    });
    setDialogOpen(false);
    setTitle(""); setDescription(""); setPriority("medium"); setAllocatedHours(2); setProject("");
    setSelectedAssignee(null); setAssigneeSearch(""); setDueDate("");
    fetchTasks();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Assigned by Me</h2>
          <p className="text-sm text-muted-foreground mt-1">Tasks you created and assigned to others</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Assign Task
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No tasks assigned to others yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      {task.project && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{task.project}</span>
                      )}
                    </div>
                    <p className="font-medium text-sm">{task.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignee.full_name || task.assignee.username}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.hours_spent}h / {task.allocated_hours}h
                      </span>
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expected: {task.due_date}
                        </span>
                      )}
                      {task.delivery_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Delivery: {task.delivery_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Assign Task to Someone</h2>
              <button onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer text-xl">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Assign to *</label>
                {selectedAssignee ? (
                  <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted">
                    <span className="text-sm">{selectedAssignee.full_name || selectedAssignee.username}</span>
                    <button type="button" onClick={() => { setSelectedAssignee(null); setAssigneeSearch(""); }} className="text-xs text-destructive ml-auto cursor-pointer">Remove</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Search by username..."
                    />
                    {assigneeResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-40 overflow-auto">
                        {assigneeResults.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => { setSelectedAssignee(u); setAssigneeSearch(""); setAssigneeResults([]); }}
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm cursor-pointer"
                          >
                            {u.full_name || u.username} <span className="text-muted-foreground">@{u.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Task title" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hours</label>
                  <input type="number" min={0.5} step={0.5} value={allocatedHours} onChange={(e) => setAllocatedHours(Number(e.target.value))}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project</label>
                  <input type="text" value={project} onChange={(e) => setProject(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" placeholder="e.g. Frontend" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expected By *</label>
                  <input type="date" required value={dueDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!selectedAssignee}>Assign Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
