import { useEffect, useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from "@/api/client";
import type { Notification } from "@/types";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const fetchUnread = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnread(data.count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleOpen = async () => {
    if (!open) {
      const data = await getNotifications();
      setNotifications(data);
    }
    setOpen(!open);
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setUnread((u) => Math.max(0, u - 1));
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
    }
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-md hover:bg-accent transition-colors cursor-pointer">
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 max-h-96 overflow-auto">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              <div>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left p-3 border-b border-border last:border-b-0 hover:bg-accent transition-colors cursor-pointer",
                      !n.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      <div className={cn(!n.is_read ? "" : "ml-4")}>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
