// PROTOTYPE — throwaway. Floating bottom-centre bar to flip between variants.
// Hidden outside dev builds so a stray merge can't ship it.
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { useBellStore } from "./store";

export const VARIANT_STORAGE_KEY = "prototype-bell-variant";

export function PrototypeSwitcher<K extends string>({
  variants,
  current,
}: {
  variants: Record<K, string>;
  current: K;
}) {
  const [, setSearchParams] = useSearchParams();
  const { empty, setEmpty, reset, unreadCount, notifications } = useBellStore();
  const keys = Object.keys(variants) as K[];
  const index = keys.indexOf(current);

  function go(delta: number) {
    const next = keys[(index + delta + keys.length) % keys.length];
    try {
      sessionStorage.setItem(VARIANT_STORAGE_KEY, next);
    } catch {}
    setSearchParams(
      (prev) => {
        prev.set("variant", next);
        return prev;
      },
      { replace: true }
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border-2 border-dashed border-amber-500 bg-zinc-900 px-2 py-1 font-mono text-xs text-amber-200 shadow-xl">
        <button
          type="button"
          onClick={() => go(-1)}
          className="rounded-full p-1 hover:bg-zinc-700"
          aria-label="Previous variant"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-1">
          <strong className="text-amber-400">{current}</strong> ({variants[current]})
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="rounded-full p-1 hover:bg-zinc-700"
          aria-label="Next variant"
        >
          <ChevronRight className="size-4" />
        </button>
        <span className="mx-1 h-4 w-px bg-zinc-600" />
        <span className="px-1 text-zinc-400">
          {unreadCount}/{notifications.length} unread
        </span>
        <button
          type="button"
          onClick={() => setEmpty(!empty)}
          className={cn(
            "rounded-full px-2 py-0.5 hover:bg-zinc-700",
            empty && "bg-amber-500 text-zinc-900 hover:bg-amber-400"
          )}
        >
          empty
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-full px-2 py-0.5 hover:bg-zinc-700"
        >
          reset
        </button>
      </div>
    </div>
  );
}
