import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A deep module is tested through its entry points (app/modules/README.md).
// A module with no tests/ folder has nothing pinning its behaviour, and
// `npm run test:mutation` can only report every mutant in it as "no coverage".

const MODULES_ROOT = "app/modules";

const modules = readdirSync(MODULES_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const testFiles = (module: string): string[] => {
  const dir = join(MODULES_ROOT, module, "tests");
  try {
    return readdirSync(dir, { recursive: true, encoding: "utf8" }).filter(
      (file) => /\.test\.tsx?$/.test(file)
    );
  } catch {
    return [];
  }
};

describe("every module in app/modules", () => {
  it.each(modules)("%s has at least one test in tests/", (module) => {
    expect(testFiles(module)).not.toEqual([]);
  });
});
