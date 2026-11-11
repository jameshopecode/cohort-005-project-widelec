// PROTOTYPE — throwaway. The full /notifications page: every Notification, paginated.
// Reads the in-memory store from the app layout; no loader, no persistence.
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  EmptyNotifications,
  NotificationItem,
} from "~/components/prototype-bell/notification-list";
import { useBellStore } from "~/components/prototype-bell/store";

const PAGE_SIZE = 6;

export default function NotificationsPrototypePage() {
  const { notifications, unreadCount, markAllRead } = useBellStore();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => n.readAt === null)
      : notifications;
  const page = filtered.slice(0, shown);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount === 0
              ? "Nothing unread"
              : `${unreadCount} unread of ${notifications.length}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck />
          Mark all as read
        </Button>
      </div>

      <div className="mb-3 flex gap-1">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setShown(PAGE_SIZE);
            }}
            className={cn(
              "rounded-md px-3 py-1 text-sm capitalize transition-colors",
              filter === f
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="divide-y overflow-hidden rounded-lg border bg-card">
        {page.length === 0 ? (
          <EmptyNotifications />
        ) : (
          page.map((n) => <NotificationItem key={n.id} notification={n} />)
        )}
      </div>

      {shown < filtered.length && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShown((s) => s + PAGE_SIZE)}
          >
            Show older ({filtered.length - shown} more)
          </Button>
        </div>
      )}
    </div>
  );
}
