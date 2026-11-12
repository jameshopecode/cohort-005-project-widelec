import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { courses, lessons, modules, notes } from "~/db/schema";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

// ─── Notes ───
// A Note is a Student's own plain-text writing about a Lesson, private to the
// Student who wrote it: one per Student per Lesson, enforced by the unique
// index on (user_id, lesson_id). Nothing outside the owning Student's Lesson
// page and Saved page may read a Note body. See GLOSSARY.md.
//
// Every function takes the database first, so tests can hand in an in-memory
// one. Uses positional parameters (project convention).

export type Db = BetterSQLite3Database<typeof schema>;

type Note = typeof notes.$inferSelect;

export type NoteFailure = { ok: false; error: string };

export type SaveNoteResult = { ok: true; note: Note | null } | NoteFailure;

function lessonExists(db: Db, lessonId: number) {
  return !!db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .get();
}

export function getNote(db: Db, userId: number, lessonId: number) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
    .get();
}

/**
 * Stores the Student's Note on the Lesson. A first save creates it; a later
 * save replaces the body and moves `updatedAt` on, leaving `createdAt` alone.
 * The body is trimmed and refused past MAX_NOTE_LENGTH. Saving an empty body
 * removes the Note, which is how a Student clears one.
 */
export function saveNote(
  db: Db,
  userId: number,
  lessonId: number,
  body: string,
  now: Date
): SaveNoteResult {
  const trimmed = body.trim();
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `A note must be ${MAX_NOTE_LENGTH.toLocaleString("en-US")} characters or fewer.`,
    };
  }

  if (!lessonExists(db, lessonId)) {
    return { ok: false, error: "Lesson not found" };
  }

  const existing = getNote(db, userId, lessonId);
  const timestamp = now.toISOString();

  if (trimmed.length === 0) {
    if (existing) {
      db.delete(notes).where(eq(notes.id, existing.id)).run();
    }
    return { ok: true, note: null };
  }

  if (existing) {
    const note = db
      .update(notes)
      .set({ body: trimmed, updatedAt: timestamp })
      .where(eq(notes.id, existing.id))
      .returning()
      .get();
    return { ok: true, note: note ?? null };
  }

  const note = db
    .insert(notes)
    .values({
      userId,
      lessonId,
      body: trimmed,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning()
    .get();
  return { ok: true, note };
}

/**
 * The Student's Notes, most recently edited first, each with the Lesson and
 * Course it belongs to so the Saved page can link back.
 */
export function listNotes(db: Db, userId: number) {
  return db
    .select({
      id: notes.id,
      body: notes.body,
      updatedAt: notes.updatedAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(notes)
    .innerJoin(lessons, eq(notes.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt), desc(notes.id))
    .all();
}
