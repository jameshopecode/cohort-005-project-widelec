import { z } from "zod/v4";

// The findings the review left for a human. The workflow posts each one as
// an inline comment on the pull request, on its file and line.
export const reviewSchema = z
  .strictObject({
    comments: z
      .array(
        z.strictObject({
          path: z
            .string()
            .min(1)
            .describe("The file, relative to the repository root."),
          line: z
            .number()
            .int()
            .positive()
            .describe(
              "A line in the file as it is now, inside a hunk of the diff against the base. A comment outside the hunks is listed under the verdict instead."
            ),
          body: z
            .string()
            .min(1)
            .describe(
              "The decision, in Markdown: what is at stake, why it needs a human, and the options you see."
            ),
        })
      )
      .describe(
        "One entry per finding left for a human. Empty when you fixed everything."
      ),
  })
  .describe("The review's inline comments.");
