import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Clock, Calendar, CalendarClock, User, Users, Search } from "lucide-react";
import type { Task, UserBrief } from "@/types";
import { searchUsers, getUserTasks } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

export default function TeamPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [userResults, setUserResults] = useState<UserBrief[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserBrief | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setUserResults([]); return; }
    const timeout = setTimeout(async () => {
      const results = await searchUsers(search);
      setUserResults(results.filter((u) => u.id !== user?.id));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, user?.id]);

  const fetchUserTasks = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      const [today, tomorrow, inProgress] = await Promise.all([
        getUserTasks(userId, "today"),
        getUserTasks(userId, "tomorrow"),
        getUserTasks(userId, "in_progress"),
      ]);
      setTodayTasks(today);
      setTomorrowTasks(tomorrow);
      setInProgressTasks(inProgress);
    } catch (err) {
      console.error("Failed to fetch user tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectUser = (u: UserBrief) => {
    setSelectedUser(u);
    setSearch("");
    setUserResults([]);
    fetchUserTasks(u.id);
  };

  const TaskRow = ({ task }: { task: Task }) => (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {task.project && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{task.project}</span>
          )}
        </div>
        <p className="font-medium text-sm">{task.title}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.hours_spent}h / {task.allocated_hours}h
          </span>
          {task.creator && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              by {task.creator.full_name || task.creator.username}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> Expected: {task.due_date}
            </span>
          )}
          {task.delivery_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Delivery: {task.delivery_date}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Team View
        </h2>
        <p className="text-sm text-muted-foreground mt-1">See what your teammates are working on</p>
      </div>

      <div className="relative mb-6">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          {selectedUser ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-muted flex-1">
              <span className="text-sm font-medium">{selectedUser.full_name || selectedUser.username}</span>
              <span className="text-xs text-muted-foreground">@{selectedUser.username}</span>
              <button
                onClick={() => { setSelectedUser(null); setTodayTasks([]); setTomorrowTasks([]); setInProgressTasks([]); }}
                className="text-xs text-destructive ml-auto cursor-pointer"
              >
                Clear
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Search for a team member..."
            />
          )}
        </div>
        {userResults.length > 0 && (
          <div className="absolute top-full left-6 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-40 overflow-auto">
            {userResults.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm cursor-pointer"
              >
                {u.full_name || u.username} <span className="text-muted-foreground">@{u.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedUser && (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Search for a team member to see their schedule</p>
        </div>
      )}

      {selectedUser && loading && (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      )}

      {selectedUser && !loading && (
        <div className="space-y-8">
          {inProgressTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                In Progress ({inProgressTasks.length})
              </h3>
              <div className="space-y-2">
                {inProgressTasks.map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              Today ({todayTasks.length})
            </h3>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No tasks scheduled for today</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              Tomorrow ({tomorrowTasks.length})
            </h3>
            {tomorrowTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No tasks scheduled for tomorrow</p>
            ) : (
              <div className="space-y-2">
                {tomorrowTasks.map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
