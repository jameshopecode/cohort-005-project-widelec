import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteLengthTone = "normal" | "warning" | "over";

export type NoteLengthStatus = {
  label: string;
  tone: NoteLengthTone;
  isOverLimit: boolean;
};

// Warn in the last tenth, so the Student sees the limit coming before Save
// rejects the note.
const WARNING_THRESHOLD = Math.floor(MAX_NOTE_LENGTH * 0.9);

function formatCount(count: number): string {
  return count.toLocaleString("en");
}

function toneFor(length: number): NoteLengthTone {
  if (length > MAX_NOTE_LENGTH) return "over";
  if (length >= WARNING_THRESHOLD) return "warning";
  return "normal";
}

// `string.length` counts UTF-16 code units, which is what the save schema's
// `.max()` counts too, so the counter and the server agree on the limit.
export function computeNoteLengthStatus(body: string): NoteLengthStatus {
  const length = body.length;
  const tone = toneFor(length);
  return {
    label: `${formatCount(length)} / ${formatCount(MAX_NOTE_LENGTH)}`,
    tone,
    isOverLimit: tone === "over",
  };
}
