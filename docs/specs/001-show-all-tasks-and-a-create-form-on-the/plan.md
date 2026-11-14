---
spec_id: 001-show-all-tasks-and-a-create-form-on-the
shape: web-nextjs
spec_hash: 980ed8de2b1a
summary: Start page lists all tasks from the Task API and creates tasks through a Server Action, with error states for an unavailable API
tasks:
  - id: t1
    title: Add the server-side Task API client and document API_URL
    files: [lib/tasks-api.ts, docs/env-vars.md, app/api/ready/route.ts]
    covers: [AC-001.1, AC-001.3, AC-001.5, AC-001.6, AC-001.7, AC-001.8]
    parallel_safe: true
    depends_on: []
    done: true
  - id: t2
    title: Add shared title and due-date input checks
    files: [lib/task-input.ts]
    covers: [AC-001.3, AC-001.4]
    parallel_safe: true
    depends_on: []
    done: true
  - id: t3
    title: Replace the starter page with the task list and create form
    files: [app/actions.ts, app/_components/task-board.tsx, app/page.tsx, app/globals.css, tests/page.test.tsx, e2e/home.spec.ts, e2e/smoke.spec.ts]
    covers: [AC-001.1, AC-001.2, AC-001.3, AC-001.4, AC-001.5, AC-001.6, AC-001.7]
    parallel_safe: false
    depends_on: [t1, t2]
---

# Plan — 001 Show all tasks and a create form on the Taskboard start page

Contract and module layout: [design.md](design.md).

## t1 — Add the server-side Task API client and document API_URL

**Files:** lib/tasks-api.ts, docs/env-vars.md, app/api/ready/route.ts
**Covers:** AC-001.1, AC-001.3, AC-001.5, AC-001.6, AC-001.7, AC-001.8
**Goal:** One server-only module that talks to the Task API at `API_URL`. It maps every response, timeout and connection error to the result types in design.md and logs every failed call.

**Implementation notes:**
- Export `Task`, `ListTasksResult`, `CreateTaskInput`, `CreateTaskResult`, `listTasks()` and `createTask()` exactly as in design.md "Contract".
- Read `process.env.API_URL` inside each call, not at module load, so tests can set it per test. Strip a trailing `/`. If it is unset, return the failure result and log `status: "connection_error", reason: "api_url_unset"`.
- `fetch` with `cache: "no-store"` and `signal: AbortSignal.timeout(6000)`. Map a `TimeoutError` to `status: "timeout"` and any other throw to `"connection_error"`.
- Validate the body with a small type guard (`isTask`). Do not add a schema library.
- Log each failure once with `logger.warn("task_api_call_failed", { method, path: "/tasks", status, reason? })` from `@/lib/logger`. Never log the full API body.
- No retry anywhere, and no sorting of the list.
- `docs/env-vars.md`: add `API_URL` to "Core": default unset (the start page then shows the load-error message), set in the cluster to `http://taskboard16-api` by the gitops repo, server-side only and never `NEXT_PUBLIC_`.
- `app/api/ready/route.ts`: replace the "add dependency checks" comment with one saying that readiness deliberately does not check the Task API, so the start page can show its error message while the API is down (AC-001.8). No behaviour change.

**Done when:** a unit test with stubbed `fetch` shows each mapping in design.md (200 valid/invalid body, 201, 422, 503, 500, timeout, connection error, unset `API_URL`) and the log line. The AC-001.8 acceptance tests pass. `devbox run quality` is clean.

## t2 — Add shared title and due-date input checks

**Files:** lib/task-input.ts
**Covers:** AC-001.3, AC-001.4
**Goal:** Pure functions that the browser and the Server Action share, so both apply the same title rule.

**Implementation notes:**
- `TITLE_MAX = 200`. `isValidTitle(raw)` is true when `raw.trim().length` is between 1 and 200. Count UTF-16 length; the API counts in Python characters, which differs only for astral symbols, and any resulting `422` is still handled (AC-001.5).
- `toDueDate(raw)`: `""` gives `null`; a `^\d{4}-\d{2}-\d{2}$` string gives itself; anything else gives `null`.
- No imports from `next/*` or Node-only modules: the client component imports this file.

**Done when:** a unit test covers empty, whitespace-only, 1, 200 and 201 characters after trimming, and the due-date mapping. `devbox run quality` is clean.

## t3 — Replace the starter page with the task list and create form

**Files:** app/actions.ts, app/_components/task-board.tsx, app/page.tsx, app/globals.css, tests/page.test.tsx, e2e/home.spec.ts, e2e/smoke.spec.ts
**Covers:** AC-001.1, AC-001.2, AC-001.3, AC-001.4, AC-001.5, AC-001.6, AC-001.7
**Goal:** The start page `/` shows the tasks (or "No tasks yet", or the load-error message) and a create form. A submitted task appears at the end of the list without a reload. The page uses the roles, labels and texts in design.md "Rendered page".

**Implementation notes:**
- `app/actions.ts`: `"use server"`, `createTaskAction({title, due_date})`. It checks `isValidTitle`, returns `{kind: "invalid"}` without an API call when the check fails, and otherwise returns `createTask({title, due_date: toDueDate(due_date)})`.
- `app/page.tsx`: `export const dynamic = "force-dynamic"`, async default export. It awaits `listTasks()` and renders the `h1` "Taskboard" plus `<TaskBoard initial={result} />`. Remove the starter content.
- `app/_components/task-board.tsx`: `"use client"`. Holds the tasks in state from `initial`, plus controlled `title` and `dueDate` inputs, a `pending` flag and the form message.
- Submit handler: `preventDefault`, then the client-side `isValidTitle` check, then `await createTaskAction(...)` inside `try`. A throw counts as `failed`. Map the result to list, inputs and messages exactly as in design.md. No `<form action>`, no `revalidatePath`, no retry.
- Render the due date as the raw string, or "No due date" for `null`. Use `data-testid="task-title"` and `data-testid="task-due"` on the list items.
- `app/globals.css`: styles for the list, the empty and error states and the form, using the existing tokens. The layout must stay free of horizontal scroll at 375 px.
- `tests/page.test.tsx`: replace the starter-page tests with tests for the new page. Stub `fetch` and set `API_URL`; use `render(await HomePage())` for the three load states.
- `e2e/home.spec.ts`: change the h1 assertion to "Taskboard" and drop the "Check health" link test, since the link is gone. Keep the health request check, the 404 test and the phone-width test.
- `e2e/smoke.spec.ts`: add a read-only `@smoke` test that the start page loads and shows the "Create task" form. Keep the existing test.

**Done when:** the acceptance tests for AC-001.1 to AC-001.7 pass. `devbox run quality` and `devbox run test` pass, including the 80% coverage gate on `app/`.
