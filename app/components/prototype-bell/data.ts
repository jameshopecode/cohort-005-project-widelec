// PROTOTYPE — throwaway. Seeded fake Notifications for the bell prototype.
// Three variants of the bell, switchable via `?variant=`, mounted in the app layout.

export type NotificationTypeKey =
  | "refund-approved"
  | "refund-declined"
  | "refund-requested"
  | "comment-reply"
  | "seat-claimed"
  | "new-enrollment"
  | "test";

export interface FakeNotification {
  id: number;
  type: NotificationTypeKey;
  title: string;
  body: string;
  href: string;
  createdAt: Date;
  readAt: Date | null;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function seedNotifications(now: Date): FakeNotification[] {
  const t = (ago: number) => new Date(now.getTime() - ago);
  const seed: Array<Omit<FakeNotification, "id">> = [
    {
      type: "comment-reply",
      title: "Maria Nowak replied to your comment",
      body: "“Good catch — the generic constraint should be `T extends object` there.”",
      href: "/courses/introduction-to-typescript",
      createdAt: t(4 * MIN),
      readAt: null,
    },
    {
      type: "refund-approved",
      title: "Refund approved",
      body: "Your refund for Building REST APIs with Node.js was approved. Access has been revoked.",
      href: "/dashboard",
      createdAt: t(38 * MIN),
      readAt: null,
    },
    {
      type: "seat-claimed",
      title: "A seat was claimed",
      body: "Piotr Kowalski claimed a seat on your Acme Corp team licence for Design Systems with Tailwind.",
      href: "/team",
      createdAt: t(3 * HOUR),
      readAt: null,
    },
    {
      type: "new-enrollment",
      title: "New student enrolled",
      body: "Anna Wiśniewska enrolled in Practical Data Visualisation.",
      href: "/instructor",
      createdAt: t(7 * HOUR),
      readAt: t(6 * HOUR),
    },
    {
      type: "refund-requested",
      title: "New refund request",
      body: "Tomasz Zieliński asked for a refund on Shipping with Docker and Kubernetes.",
      href: "/admin/refunds",
      createdAt: t(1 * DAY + 2 * HOUR),
      readAt: null,
    },
    {
      type: "comment-reply",
      title: "Jan Kowalczyk replied to your comment",
      body: "“Thanks! That fixed it for me as well.”",
      href: "/courses/building-rest-apis-with-nodejs",
      createdAt: t(1 * DAY + 9 * HOUR),
      readAt: t(1 * DAY),
    },
    {
      type: "refund-declined",
      title: "Refund declined",
      body: "Your refund for Introduction to TypeScript was declined: more than 30 days since purchase.",
      href: "/dashboard",
      createdAt: t(2 * DAY),
      readAt: t(2 * DAY - HOUR),
    },
    {
      type: "test",
      title: "Test notification",
      body: "If you can read this, the In-app channel works.",
      href: "/admin/notifications",
      createdAt: t(3 * DAY),
      readAt: t(3 * DAY),
    },
    {
      type: "new-enrollment",
      title: "New student enrolled",
      body: "Karol Lewandowski claimed a seat in Design Systems with Tailwind.",
      href: "/instructor",
      createdAt: t(4 * DAY),
      readAt: t(4 * DAY),
    },
    {
      type: "seat-claimed",
      title: "A seat was claimed",
      body: "Ewa Dąbrowska claimed a seat on your Acme Corp team licence for Introduction to TypeScript.",
      href: "/team",
      createdAt: t(5 * DAY),
      readAt: t(5 * DAY),
    },
    {
      type: "refund-requested",
      title: "New refund request",
      body: "Magda Wójcik asked for a refund on Practical Data Visualisation.",
      href: "/admin/refunds",
      createdAt: t(6 * DAY),
      readAt: t(6 * DAY),
    },
    {
      type: "comment-reply",
      title: "Maria Nowak replied to your comment",
      body: "“I'd put that in a separate module, honestly.”",
      href: "/courses/introduction-to-typescript",
      createdAt: t(9 * DAY),
      readAt: t(9 * DAY),
    },
    {
      type: "refund-approved",
      title: "Refund approved",
      body: "Your refund for Shipping with Docker and Kubernetes was approved.",
      href: "/dashboard",
      createdAt: t(16 * DAY),
      readAt: t(16 * DAY),
    },
    {
      type: "new-enrollment",
      title: "New student enrolled",
      body: "Zofia Kamińska enrolled in Practical Data Visualisation.",
      href: "/instructor",
      createdAt: t(31 * DAY),
      readAt: t(31 * DAY),
    },
  ];
  return seed.map((n, i) => ({ ...n, id: i + 1 }));
}

export function relativeTime(date: Date, now: Date): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
