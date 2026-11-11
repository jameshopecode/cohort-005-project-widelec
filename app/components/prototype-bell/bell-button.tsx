// PROTOTYPE — throwaway. The bell icon with its unread badge; variants decide what it does.
import { forwardRef } from "react";
import { Bell } from "lucide-react";
import { cn } from "~/lib/utils";

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-sidebar",
        className
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export const BellButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { unread: number; tone?: "sidebar" | "bar" }
>(function BellButton({ unread, tone = "sidebar", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      title="Notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={cn(
        "relative rounded-md p-1 transition-colors",
        tone === "sidebar"
          ? "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          : "p-2 text-muted-foreground hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
        className
      )}
      {...props}
    >
      <Bell className={tone === "sidebar" ? "size-4" : "size-5"} />
      <UnreadBadge
        count={unread}
        className={tone === "bar" ? "ring-background" : undefined}
      />
    </button>
  );
});
