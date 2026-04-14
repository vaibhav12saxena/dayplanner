import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/Badge";
import type { RecurringRule, TaskPriority } from "@/types";
import { getRecurringRules, createRecurringRule, deleteRecurringRule, toggleRecurringRule, generateRecurringTasks } from "@/api/client";

const FREQ_LABELS: Record<string, string> = {
  daily: "Every day",
  weekly_mon: "Every Monday",
  weekly_tue: "Every Tuesday",
  weekly_wed: "Every Wednesday",
  weekly_thu: "Every Thursday",
  weekly_fri: "Every Friday",
  weekly_sat: "Every Saturday",
  weekly_sun: "Every Sunday",
};

export default function RecurringPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [genMsg, setGenMsg] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [hours, setHours] = useState(1);
  const [project, setProject] = useState("");
  const [frequency, setFrequency] = useState("daily");

  const fetchRules = useCallback(async () => {
    try {
      setRules(await getRecurringRules());
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRecurringRule({ title, description, priority, allocated_hours: hours, project, frequency });
    setDialogOpen(false);
    setTitle(""); setDescription(""); setPriority("medium"); setHours(1); setProject(""); setFrequency("daily");
    fetchRules();
  };

  const handleDelete = async (id: number) => {
    await deleteRecurringRule(id);
    fetchRules();
  };

  const handleToggle = async (id: number) => {
    await toggleRecurringRule(id);
    fetchRules();
  };

  const handleGenerate = async () => {
    const result = await generateRecurringTasks();
    setGenMsg(`Created ${result.created} task(s) for today`);
    setTimeout(() => setGenMsg(""), 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Recurring Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">Auto-create tasks on a schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGenerate}>
            Generate Today's Tasks
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Rule
          </Button>
        </div>
      </div>

      {genMsg && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
          {genMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No recurring rules yet. Create one to auto-generate tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={rule.is_active ? "" : "opacity-50"}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityBadge priority={rule.priority} />
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {FREQ_LABELS[rule.frequency] || rule.frequency}
                      </span>
                      {rule.project && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{rule.project}</span>
                      )}
                    </div>
                    <p className="font-medium text-sm">{rule.title}</p>
                    {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {rule.allocated_hours}h · Last generated: {rule.last_generated || "Never"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(rule.id)} title={rule.is_active ? "Disable" : "Enable"}>
                      <Power className={`h-3.5 w-3.5 ${rule.is_active ? "text-success" : "text-muted-foreground"}`} />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
              <h2 className="text-lg font-semibold">New Recurring Rule</h2>
              <button onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer text-xl">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Daily standup" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frequency *</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                  {Object.entries(FREQ_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
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
                  <input type="number" min={0.5} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Project</label>
                  <input type="text" value={project} onChange={(e) => setProject(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" placeholder="Optional" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Rule</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
