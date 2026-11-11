// PROTOTYPE — throwaway. Bell + popover with the last 10 Notifications (variants A and C).
import { useState } from "react";
import { Link } from "react-router";
import { Popover } from "radix-ui";
import { CheckCheck } from "lucide-react";
import { BellButton } from "./bell-button";
import { EmptyNotifications, NotificationItem } from "./notification-list";
import { useBellStore } from "./store";

export function BellPopover({
  side,
  tone,
}: {
  side: "right" | "bottom";
  tone: "sidebar" | "bar";
}) {
  const { notifications, unreadCount, markAllRead } = useBellStore();
  const [open, setOpen] = useState(false);
  const recent = notifications.slice(0, 10);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BellButton unread={unreadCount} tone={tone} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="z-50 w-[380px] max-w-[calc(100vw-16px)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none"
        >
          <div className="flex h-11 items-center justify-between border-b px-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <CheckCheck className="size-3.5" />
              Mark all as read
            </button>
          </div>

          <div className="max-h-[420px] divide-y overflow-y-auto">
            {recent.length === 0 ? (
              <EmptyNotifications compact />
            ) : (
              recent.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  dense
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t px-4 py-2.5 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            See all notifications
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
