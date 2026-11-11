// PROTOTYPE — throwaway. In-memory Notification state shared by the bell and the page.
import { createContext, useContext, useMemo, useState } from "react";
import { seedNotifications, type FakeNotification } from "./data";

interface BellStore {
  now: Date;
  notifications: FakeNotification[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  empty: boolean;
  setEmpty: (empty: boolean) => void;
  reset: () => void;
}

const BellStoreContext = createContext<BellStore | null>(null);

export function BellStoreProvider({ children }: { children: React.ReactNode }) {
  const [now] = useState(() => new Date());
  const [all, setAll] = useState(() => seedNotifications(now));
  const [empty, setEmpty] = useState(false);

  const value = useMemo<BellStore>(() => {
    const notifications = empty ? [] : all;
    return {
      now,
      notifications,
      unreadCount: notifications.filter((n) => n.readAt === null).length,
      markRead: (id) =>
        setAll((list) =>
          list.map((n) =>
            n.id === id && n.readAt === null ? { ...n, readAt: new Date() } : n
          )
        ),
      markAllRead: () =>
        setAll((list) =>
          list.map((n) => (n.readAt === null ? { ...n, readAt: new Date() } : n))
        ),
      empty,
      setEmpty,
      reset: () => {
        setAll(seedNotifications(now));
        setEmpty(false);
      },
    };
  }, [all, empty, now]);

  return (
    <BellStoreContext.Provider value={value}>{children}</BellStoreContext.Provider>
  );
}

export function useBellStore(): BellStore {
  const store = useContext(BellStoreContext);
  if (!store) throw new Error("useBellStore outside BellStoreProvider");
  return store;
}
