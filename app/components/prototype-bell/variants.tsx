// PROTOTYPE — throwaway. Three chromes for the bell, switchable via `?variant=`
// on every route under the app layout:
//   A — bell in the sidebar user row, popover of the last 10, "See all" link
//   B — bell in the sidebar user row, click goes straight to /notifications
//   C — slim top bar above the content area, popover as in A
import { NavLink, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { Sidebar } from "~/components/sidebar";
import { UserAvatar } from "~/components/user-avatar";
import { BellButton, UnreadBadge } from "./bell-button";
import { BellPopover } from "./bell-popover";
import { useBellStore } from "./store";
import { Bell } from "lucide-react";

type SidebarProps = React.ComponentProps<typeof Sidebar>;

interface ChromeProps {
  sidebar: SidebarProps;
  children: React.ReactNode;
}

export const variantNames = {
  A: "Sidebar bell + popover (chosen)",
  B: "Sidebar bell → page",
  C: "Top bar bell + popover",
} as const;

export type VariantKey = keyof typeof variantNames;

export function VariantA({ sidebar, children }: ChromeProps) {
  return (
    <>
      <Sidebar
        {...sidebar}
        stackedUserRow
        userRowExtra={<BellPopover side="right" tone="sidebar" />}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </>
  );
}

function BellLink() {
  const { unreadCount } = useBellStore();
  return (
    <NavLink
      to="/notifications"
      title="Notifications"
      aria-label={
        unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"
      }
      className={({ isActive }) =>
        cn(
          "relative rounded-md p-1 transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <Bell className="size-4" />
      <UnreadBadge count={unreadCount} />
    </NavLink>
  );
}

export function VariantB({ sidebar, children }: ChromeProps) {
  return (
    <>
      <Sidebar {...sidebar} userRowExtra={<BellLink />} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </>
  );
}

const sectionTitles: Record<string, string> = {
  dashboard: "Dashboard",
  courses: "Courses",
  instructor: "Instructor",
  admin: "Admin",
  settings: "Settings",
  team: "Team",
  notifications: "Notifications",
  redeem: "Redeem",
};

export function VariantC({ sidebar, children }: ChromeProps) {
  const { pathname } = useLocation();
  const section = pathname.split("/")[1] ?? "";
  const user = sidebar.currentUser;

  return (
    <>
      <Sidebar {...sidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-4">
          <span className="text-sm font-medium text-muted-foreground">
            {sectionTitles[section] ?? "Cadence"}
          </span>
          <div className="flex items-center gap-2">
            <BellPopover side="bottom" tone="bar" />
            {user && (
              <NavLink to="/settings" title="Settings" className="rounded-full">
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  className="size-7"
                />
              </NavLink>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}

// Keeps the unused import from being flagged if a variant stops using it.
void BellButton;
