import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { getNote, listNotes, saveNote } from "./notes.server";
import { MAX_NOTE_LENGTH } from "./notes";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);

function minutesLater(minutes: number) {
  return new Date(NOW.getTime() + minutes * 60_000);
}

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2, 3].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

function addStudent(name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase()}@example.com`,
      role: schema.UserRole.Student,
    })
    .returning()
    .get();
}

function noteRows(userId: number) {
  return db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.userId, userId))
    .all();
}

describe("saving a Note", () => {
  it("creates the Note with the body trimmed", () => {
    const result = saveNote(
      db,
      base.user.id,
      lessonIds[0],
      "  Remember the closing bracket.  ",
      NOW
    );

    expect(result).toMatchObject({
      ok: true,
      note: {
        userId: base.user.id,
        lessonId: lessonIds[0],
        body: "Remember the closing bracket.",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    });
  });

  it("replaces the body and moves the last-edited time on, keeping createdAt", () => {
    saveNote(db, base.user.id, lessonIds[0], "First draft", NOW);

    const later = minutesLater(30);
    const result = saveNote(db, base.user.id, lessonIds[0], "Second draft", later);

    expect(result).toMatchObject({
      ok: true,
      note: {
        body: "Second draft",
        createdAt: NOW.toISOString(),
        updatedAt: later.toISOString(),
      },
    });
    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe("Second draft");
  });

  it("never leaves a Student with two Notes on one Lesson", () => {
    saveNote(db, base.user.id, lessonIds[0], "One", NOW);
    saveNote(db, base.user.id, lessonIds[0], "Two", minutesLater(1));
    saveNote(db, base.user.id, lessonIds[0], "Three", minutesLater(2));

    expect(noteRows(base.user.id)).toHaveLength(1);
  });

  it("is enforced by the database, not only by the save", () => {
    saveNote(db, base.user.id, lessonIds[0], "One", NOW);

    expect(() =>
      db
        .insert(schema.notes)
        .values({ userId: base.user.id, lessonId: lessonIds[0], body: "Two" })
        .run()
    ).toThrow();
  });

  it("keeps the text exactly as typed, Markdown characters included", () => {
    const body = "# Heading\n\n* bullet\n`code`";
    const result = saveNote(db, base.user.id, lessonIds[0], body, NOW);

    expect(result).toMatchObject({ ok: true, note: { body } });
  });

  it("accepts a Note at exactly the cap", () => {
    const result = saveNote(
      db,
      base.user.id,
      lessonIds[0],
      "a".repeat(MAX_NOTE_LENGTH),
      NOW
    );

    expect(result.ok).toBe(true);
  });

  it("refuses a Note over the cap with a message naming it", () => {
    const result = saveNote(
      db,
      base.user.id,
      lessonIds[0],
      "a".repeat(MAX_NOTE_LENGTH + 1),
      NOW
    );

    expect(result).toEqual({
      ok: false,
      error: "A note must be 2,000 characters or fewer.",
    });
    expect(noteRows(base.user.id)).toHaveLength(0);
  });

  it("refuses a Lesson that does not exist", () => {
    expect(saveNote(db, base.user.id, 9999, "Hello", NOW)).toEqual({
      ok: false,
      error: "Lesson not found",
    });
  });

  it("removes the Note when the body is saved empty", () => {
    saveNote(db, base.user.id, lessonIds[0], "Scratch this", NOW);

    const result = saveNote(db, base.user.id, lessonIds[0], "   ", minutesLater(1));

    expect(result).toEqual({ ok: true, note: null });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });

  it("stores nothing when an empty body is saved on a Lesson with no Note", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "", NOW)).toEqual({
      ok: true,
      note: null,
    });
    expect(noteRows(base.user.id)).toHaveLength(0);
  });
});

describe("listing a Student's Notes", () => {
  it("lists only that Student's Notes, most recently edited first, with Lesson and Course", () => {
    const other = addStudent("Sam");
    saveNote(db, base.user.id, lessonIds[0], "Oldest", NOW);
    saveNote(db, base.user.id, lessonIds[1], "Middle", minutesLater(5));
    saveNote(db, base.user.id, lessonIds[2], "Newest", minutesLater(10));
    saveNote(db, other.id, lessonIds[0], "Someone else's", minutesLater(20));

    // Editing the oldest Note moves it to the top.
    saveNote(db, base.user.id, lessonIds[0], "Oldest, edited", minutesLater(15));

    expect(listNotes(db, base.user.id)).toEqual([
      expect.objectContaining({
        lessonId: lessonIds[0],
        lessonTitle: "Lesson 1",
        body: "Oldest, edited",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      }),
      expect.objectContaining({ lessonId: lessonIds[2], body: "Newest" }),
      expect.objectContaining({ lessonId: lessonIds[1], body: "Middle" }),
    ]);
  });

  it("is empty for a Student who has written nothing", () => {
    expect(listNotes(db, base.user.id)).toEqual([]);
  });
});
