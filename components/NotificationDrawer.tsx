"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";

type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

async function fetchNotifications(): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
  const res = await fetch("/api/notifications", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export function NotificationDrawer() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 15000,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsReadAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneMutation = useMutation({
    mutationFn: markNotificationReadAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative" aria-label="Notifications">
        <Bell className="w-6 h-6 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red text-[var(--theme-text)] text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-sm h-full card-surface p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Notifications</h2>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    className="text-xs text-gold hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {!data || data.notifications.length === 0 ? (
                <p className="text-sm text-muted">No notifications yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => !n.read && markOneMutation.mutate(n.id)}
                      className={clsx(
                        "text-left rounded-xl p-3 border transition",
                        n.read ? "bg-surface-2 border-border" : "bg-gold/10 border-gold/40"
                      )}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-muted mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
