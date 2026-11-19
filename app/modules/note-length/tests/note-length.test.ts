import { describe, it, expect } from "vitest";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { noteLengthStatus } from "../index";

describe("noteLengthStatus", () => {
  it("counts an empty note as zero of the limit", () => {
    expect(noteLengthStatus("")).toEqual({
      label: "0 / 2,000",
      tone: "normal",
      isOverLimit: false,
    });
  });

  it("counts every character, including spaces and newlines", () => {
    expect(noteLengthStatus("a b\nc").label).toBe("5 / 2,000");
  });

  it("stays normal just below the warning threshold", () => {
    expect(noteLengthStatus("x".repeat(1799)).tone).toBe("normal");
  });

  it("warns from 90% of the limit", () => {
    const status = noteLengthStatus("x".repeat(1800));
    expect(status.tone).toBe("warning");
    expect(status.label).toBe("1,800 / 2,000");
    expect(status.isOverLimit).toBe(false);
  });

  it("still allows a note exactly at the limit", () => {
    const status = noteLengthStatus("x".repeat(MAX_NOTE_LENGTH));
    expect(status.tone).toBe("warning");
    expect(status.isOverLimit).toBe(false);
  });

  it("flags a note one character over the limit", () => {
    const status = noteLengthStatus("x".repeat(MAX_NOTE_LENGTH + 1));
    expect(status).toEqual({
      label: "2,001 / 2,000",
      tone: "over",
      isOverLimit: true,
    });
  });

  it("counts an emoji as two, the way the save limit does", () => {
    expect(noteLengthStatus("👍").label).toBe("2 / 2,000");
  });
});
