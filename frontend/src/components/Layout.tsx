import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarCheck, CalendarPlus, Inbox, ListChecks, ShieldCheck, BarChart3, LogOut, Settings, Send, Users, Moon, Sun, Search, X, Menu, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { searchTasks } from "@/api/client";
import type { Task } from "@/types";

const navItems = [
  { to: "/", icon: CalendarCheck, label: "Today" },
  { to: "/tomorrow", icon: CalendarPlus, label: "Tomorrow" },
  { to: "/backlog", icon: Inbox, label: "Backlog" },
  { to: "/assigned", icon: Send, label: "Assigned by Me" },
  { to: "/team", icon: Users, label: "Team View" },
  { to: "/approvals", icon: ShieldCheck, label: "Approvals" },
  { to: "/recurring", icon: Repeat, label: "Recurring" },
  { to: "/yesterday", icon: ListChecks, label: "Yesterday" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, toggleDark] = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const results = await searchTasks(searchQuery);
        setSearchResults(results);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <CalendarCheck className="h-6 w-6" />
          DayForge
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Personal Task Tracker</p>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
            {(user?.full_name || user?.username || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.username}</p>
            <p className="text-[10px] text-muted-foreground">{user?.daily_work_hours}h/day</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NavLink
            to="/settings"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-background flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 h-full bg-background flex flex-col z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex items-center gap-3 p-3 border-b border-border bg-background">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground cursor-pointer">
            <Menu className="h-5 w-5" />
          </button>
          <div ref={searchRef} className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
                {searchResults.map((t) => (
                  <div key={t.id} className="px-3 py-2 hover:bg-accent text-sm border-b border-border last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", t.priority === "critical" ? "bg-destructive" : t.priority === "high" ? "bg-warning" : t.priority === "medium" ? "bg-primary" : "bg-muted-foreground")} />
                      <span className="font-medium truncate">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{t.status}</span>
                    </div>
                    {t.project && <p className="text-[10px] text-muted-foreground mt-0.5">{t.project}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={toggleDark} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Toggle dark mode">
            {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          <NotificationBell />
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
