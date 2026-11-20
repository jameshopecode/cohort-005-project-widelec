# Coding standards

## Fail with a thrown response, not a return value

A loader or an action that cannot continue throws. It does not return an
error shape for the component to unpack.

```ts
if (!course) throw data("Course not found", { status: 404 });
```

The route then has one success path. A returned error shape gives every
component a second path to forget about.

## Parse untrusted input with a schema, at the edge

Form data, search parameters and request bodies get a zod schema before the
values reach any query. Parse once, at the boundary; after that the value has
a type and you do not check it again. Coerce numbers through the schema, not
`Number()`: `Number("")` is `0`, and an empty `lessonId` once opened lesson 0
for every learner. oxlint rejects `Number()` of `params`, `formData.get()` and
`searchParams.get()`.

## Check permission in the action, not only the loader

A loader guard does not protect an action. They are separate requests. For a
week anybody who was signed in could approve a refund by posting to
`/admin/refunds`.

## A route does not query data a module owns

Once a module owns a feature's data, the route asks the module for it and
does not import `~/db` or `drizzle-orm` itself. The instructor analytics
route gets everything from `instructorAnalytics`. A query in the loader
splits the feature's rules across two files, and the module's tests stop
covering what the page shows. `npm run lint:boundaries` enforces this for
every route not on the `routes-no-db` list of older routes in
`.dependency-cruiser.cjs`. See [app/modules/README.md](./app/modules/README.md).

## Name a module for its domain

A module is named for what it knows (`notes`, `quizzes`, `lesson-progress`),
not for the page that first needed it (`lesson-page`). A page-named module
collects every unrelated reason the page changes.

## An entry point that delegates to `lib/` is the module's shape

`index.ts` calling one function in `lib/` is how a module hides its
internals (see `app/modules/example/`). It is not a Middle Man: leave it.

## A module's `lib/` takes the database as a parameter

Only the entry point binds the app database; `lib/` receives it, as
`createInstructorAnalytics(database)` does. Then a test can hand the module a
test database. `npm run lint:boundaries` enforces this, and
`scripts/modules-have-tests.test.ts` fails for a module with no tests.

## Arrange tests through the module under test

Test setup calls the module's own functions. When the function you need does
not exist, add it to the module rather than inserting rows directly, so a
change to how the module stores its data leaves its tests alone.

## A split forced by the file-size limit is its own commit

The pre-commit hook rejects any touched file over 5000 tokens, so editing a
large file can force a split. That split is in scope, not scope creep, as long
as it lands in a commit of its own that moves code and changes no behaviour,
before the commit with the change itself. A reader can then check the move
with `git diff --color-moved` and read the change on its own.

## A lint exemption follows moved code, never new code

The per-file exemptions in `.oxlintrc.json` are debt in files that predate a
rule. When code moves, its exemption may move with it. New code meets the
rule, so it never gets an exemption of its own.

## Wrap related writes in a transaction

Two writes that must both land, or neither, go in a transaction. If the second
one fails and the first stayed, you have invented a state nothing knows how to
read. (The refund bug: the refund was approved, the enrollment was never
ended, and the learner kept the course.)

## Do not read from the database in a loop

One query per item is N+1 queries. Use a join, or one query with an `IN`. The
notes loader ran one query per lesson, forty lessons per course.

## Paginate anything that can grow

A query with no limit is fine on a seeded database and fatal on a real one.
If the row count is a function of how long the product has been alive, add a
limit. The instructor's students page timed out on the first big course.

## Soft-delete anything a person can point at

If another row references it, or a person has a link to it, do not delete it.
Mark it deleted and filter it out on read. Deleting a lesson used to take the
learners' notes and bookmarks with it.

## Enumerations live in the schema file

A status string that the code compares against is an enum in `app/db/schema.ts`,
not a literal repeated in six places. Refund status was `"pending"` in four
files and `"Pending"` in one.

## Inject the clock

A function that calls `Date.now()` cannot be tested at a fixed moment. Take
the time as an argument. The refund window tests failed every night at
midnight until we did this. oxlint rejects `Date.now()` and `new Date()` in
`app/lib/` and `app/modules/`.

## Keep secrets on the server

Anything the browser can read is public. A secret is read only in a
`.server` file.

## Do not put a side effect in the render path

Rendering is for working out what the output is, not for doing something.
Anything that touches the outside world belongs in an effect or an action.

## Derive, do not store

If a value can be worked out from another value you already hold, work it out.
Storing it gives you two things that must agree, and one day they will not.

```ts
// Bad
const [items, setItems] = useState(rows);
const [count, setCount] = useState(rows.length);

// Good
const [items, setItems] = useState(rows);
const count = items.length;
```

## A comment explains why

Name and extract until a comment is unnecessary. A comment earns its place
only for a _why_ the code cannot express: a constraint, a decision, a link to
the ADR behind it. A comment that restates _what_ the code does goes stale the
first time the code changes.
