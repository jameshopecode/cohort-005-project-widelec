import { useState } from "react";
import { useFetcher } from "react-router";
import { noteLengthStatus, type NoteLengthTone } from "~/modules/note-length";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { NotebookPen } from "lucide-react";
import { cn, formatRelativeTime } from "~/lib/utils";
import type { LessonLoaderData } from "./types";

export function LessonNote({ note }: { note: LessonLoaderData["note"] }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [body, setBody] = useState(note?.body ?? "");
  const length = noteLengthStatus(body);
  const isSaving = fetcher.state !== "idle";
  const error = fetcher.data?.error;

  return (
    <Card className="mb-8">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">Your notes</h2>
        </div>

        <fetcher.Form method="post" className="space-y-3">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Only you can read this."
            className="min-h-32 resize-y"
            aria-invalid={length.isOverLimit || undefined}
            aria-describedby="note-length"
          />
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || length.isOverLimit}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <NoteSaveStatus error={error} note={note} />
            <NoteLengthCounter tone={length.tone} label={length.label} />
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteSaveStatus({
  error,
  note,
}: {
  error: string | undefined;
  note: LessonLoaderData["note"];
}) {
  if (error) return <span className="text-sm text-red-600">{error}</span>;
  if (!note) return null;
  return (
    <span suppressHydrationWarning className="text-xs text-muted-foreground">
      Last edited {formatRelativeTime(note.updatedAt)}
    </span>
  );
}

function NoteLengthCounter({
  tone,
  label,
}: {
  tone: NoteLengthTone;
  label: string;
}) {
  return (
    <span
      id="note-length"
      aria-live="polite"
      className={cn(
        "ml-auto text-xs tabular-nums",
        NOTE_LENGTH_TONE_CLASS[tone]
      )}
    >
      {label}
    </span>
  );
}

const NOTE_LENGTH_TONE_CLASS: Record<NoteLengthTone, string> = {
  normal: "text-muted-foreground",
  warning: "text-amber-600",
  over: "font-medium text-red-600",
};
