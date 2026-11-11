// PROTOTYPE — throwaway. Shared list item + empty state used by the popover and the page.
import { useNavigate } from "react-router";
import { BellOff } from "lucide-react";
import { cn } from "~/lib/utils";
import { relativeTime, type FakeNotification } from "./data";
import { useBellStore } from "./store";

export function NotificationItem({
  notification,
  onNavigate,
  dense = false,
}: {
  notification: FakeNotification;
  onNavigate?: () => void;
  dense?: boolean;
}) {
  const { now, markRead } = useBellStore();
  const navigate = useNavigate();
  const unread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={() => {
        markRead(notification.id);
        onNavigate?.();
        navigate(notification.href);
      }}
      className={cn(
        "flex w-full items-start gap-3 text-left transition-colors hover:bg-accent",
        dense ? "px-3 py-2.5" : "px-4 py-3",
        unread && "bg-primary/[0.04] dark:bg-primary/[0.08]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent"
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm",
            unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
          )}
        >
          {notification.title}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-xs text-muted-foreground",
            dense ? "line-clamp-1" : "line-clamp-2"
          )}
        >
          {notification.body}
        </span>
      </span>
      <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground">
        {relativeTime(notification.createdAt, now)}
      </span>
    </button>
  );
}

export function EmptyNotifications({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center text-muted-foreground",
        compact ? "px-4 py-10" : "px-4 py-24"
      )}
    >
      <BellOff className={compact ? "size-6" : "size-8"} />
      <p className="mt-3 text-sm font-medium text-foreground">You're all caught up</p>
      <p className="mt-1 text-xs">Replies, refunds and enrolments will show up here.</p>
    </div>
  );
}
