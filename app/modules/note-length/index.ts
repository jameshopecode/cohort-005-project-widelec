import { computeNoteLengthStatus, type NoteLengthStatus } from "./lib/status";

export type { NoteLengthStatus, NoteLengthTone } from "./lib/status";

/**
 * The character counter under a lesson note: what it reads, how loudly it
 * should say it, and whether the note is too long to save.
 */
export function noteLengthStatus(body: string): NoteLengthStatus {
  return computeNoteLengthStatus(body);
}
