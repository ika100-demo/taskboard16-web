# Design — 001 Show all tasks and a create form on the Taskboard start page

## Decisions

- The Task API is called only from the Next.js server through one module, `lib/tasks-api.ts` (spec "Notes for this repo"). It reads `API_URL` at call time, never through `NEXT_PUBLIC_*`, so the browser never talks to the API and no CORS is needed.
- The list is rendered by the async Server Component `app/page.tsx` (`dynamic = "force-dynamic"`, `fetch` with `cache: "no-store"`), so every page load reads `GET /tasks` fresh and the page recovers after an outage with no restart.
- Create goes through a Server Action (`app/actions.ts`), called from a client component with plain arguments (not `<form action>`). The client keeps the list in state and appends the task the API returned (AC-001.3). Two reasons: React 19 resets uncontrolled forms after a form action, which would break "keeps the entered values" (AC-001.4, AC-001.5, AC-001.7); and appending the `201` body avoids a second `GET /tasks` (no `revalidatePath`), which keeps the update well under 2 seconds.
- The title is checked twice with the same function (`lib/task-input.ts`): in the browser before the Server Action is called, and again in the Server Action before `POST /tasks`. An invalid title therefore never sends a `POST` (AC-001.4).
- The title is sent exactly as entered. Trimming is used only for the length check, because the contract says the API stores the title "exactly as sent".
- The due date is shown as the API's `YYYY-MM-DD` string and is never parsed into a `Date`, so no time-zone shift can change it (AC-001.1).
- The web UI never retries a `POST`. The submit button is disabled while a submit is pending, so a double click cannot create a duplicate task.
- `/api/health` and `/api/ready` stay independent of the Task API (AC-001.8). The ready route gets a comment saying so, so that a later change does not add an upstream check.
- No ADR: every choice here is local to this feature or already fixed by the system plan.

## Modules

| Module | Responsibility | New / changed |
|---|---|---|
| `lib/tasks-api.ts` | `Task` type; `listTasks()`, `createTask()`: fetch with a 6 s timeout, body-shape check, failure logging | new |
| `lib/task-input.ts` | `isValidTitle()`, `toDueDate()`: shared by the client and the Server Action | new |
| `app/actions.ts` | `"use server"`; `createTaskAction()` | new |
| `app/_components/task-board.tsx` | `"use client"`; list state, create form, messages | new |
| `app/page.tsx` | async Server Component: calls `listTasks()`, renders `<TaskBoard>` | changed (replaces the starter page) |
| `app/globals.css` | styles for the list and form, reusing the existing tokens | changed |
| `app/api/ready/route.ts` | comment only: readiness must not depend on the Task API | changed |
| `docs/env-vars.md` | documents `API_URL` | changed |

## Contract

### Server-side module `lib/tasks-api.ts`

```ts
export type Task = { id: string; title: string; due_date: string | null };

export type ListTasksResult = { ok: true; tasks: Task[] } | { ok: false };
export function listTasks(): Promise<ListTasksResult>;

export type CreateTaskInput = { title: string; due_date: string | null };
export type CreateTaskResult =
  | { kind: "created"; task: Task }
  | { kind: "invalid" }   // API answered 422
  | { kind: "failed" };   // anything else
export function createTask(input: CreateTaskInput): Promise<CreateTaskResult>;
```

- Base URL: `process.env.API_URL`, trailing `/` stripped; requests go to `${API_URL}/tasks`.
- `listTasks()`: `GET /tasks`, header `Accept: application/json`, `cache: "no-store"`, `signal: AbortSignal.timeout(6000)`. Returns `{ok: true, tasks}` only for status `200` with a body that is a JSON array whose every element is a valid task (see below), in the API's order with no sorting. Anything else gives `{ok: false}`: any other status, a body that is not JSON or not that shape, a timeout, a connection error, or `API_URL` unset (AC-001.6).
- `createTask()`: `POST /tasks`, headers `Content-Type: application/json`, `Accept: application/json`, body `{"title": <as entered>, "due_date": "YYYY-MM-DD" | null}` (`due_date` is always present), `cache: "no-store"`, same 6 s timeout. `201` with a valid task body gives `created`. `422` (any body) gives `invalid`. Everything else gives `failed`: other statuses, `201` with an invalid body, timeout, connection error, `API_URL` unset (AC-001.5, AC-001.7). No retry.
- A valid task is an object with `id`: string, `title`: string, and `due_date`: `null` or a string matching `^\d{4}-\d{2}-\d{2}$`. Extra fields are ignored.
- Every call that does not return `ok` / `created` writes one line `logger.warn("task_api_call_failed", fields)` with `fields = { method: "GET" | "POST", path: "/tasks", status: number | "timeout" | "connection_error", reason?: "invalid_body" | "api_url_unset" }`. Timeout means the abort signal raised `TimeoutError`; any other thrown fetch error is `connection_error`. A `422` is logged too, with `status: 422`. API error bodies are never logged in full and never shown to the user.

### `lib/task-input.ts`

```ts
export const TITLE_MAX = 200;
export function isValidTitle(raw: string): boolean;  // 1 <= raw.trim().length <= 200
export function toDueDate(raw: string): string | null; // "" -> null; "YYYY-MM-DD" -> itself; else null
```

### Server Action `app/actions.ts`

```ts
"use server";
export async function createTaskAction(input: { title: string; due_date: string }): Promise<CreateTaskResult>;
```

It returns `{kind: "invalid"}` without calling the API when `!isValidTitle(input.title)`. Otherwise it returns `createTask({ title: input.title, due_date: toDueDate(input.due_date) })`.

### Rendered page `/` (what the acceptance tests query)

The page answers `200` in every API state (AC-001.6).

- One `h1` with the text "Taskboard". The site header and footer from `app/layout.tsx` stay as they are.
- **List region:** `<section aria-labelledby>` with the `h2` "Tasks".
  - Tasks loaded and non-empty: `<ul aria-label="Tasks">`, one `<li>` per task in API order. Each `<li>` holds the title in an element with `data-testid="task-title"`, and the due date in an element with `data-testid="task-due"` that shows the `YYYY-MM-DD` text or "No due date" (AC-001.1).
  - Tasks loaded and empty: the text "No tasks yet" in a `<p>`, and no `<ul>` (AC-001.2).
  - Load failed: `<p role="alert">` with "Tasks could not be loaded. Please try again later.", and no list and no "No tasks yet" (AC-001.6).
- **Create form:** always rendered, in every state above. `<form aria-label="Create task">` contains:
  - `<input type="text" name="title">` with the label "Title",
  - `<input type="date" name="due_date">` with the label "Due date" (optional),
  - `<button type="submit">` "Add task", disabled while a submit is pending,
  - a form message `<p role="alert">` inside the form, shown only after a failed submit.
- **Submit behaviour** (in the client, `onSubmit` with `preventDefault`):
  1. `!isValidTitle(title)`: show "Title must be 1 to 200 characters", keep both values, do not call the action (AC-001.4).
  2. Otherwise call `createTaskAction({title, due_date})`. A thrown error (a network failure to the Next.js server) counts as `failed`.
     - `created`: append `task` to the end of the list (if the list was empty, the `<ul>` replaces "No tasks yet"), clear both inputs, remove the form message (AC-001.3). If the initial load had failed, the load-error message stays until the next page load.
     - `invalid`: "Title must be 1 to 200 characters", values kept, list unchanged (AC-001.5).
     - `failed`: "The task could not be saved. Please try again.", values kept, list unchanged (AC-001.7).

### Probes

`GET /api/health` → `200 {"status":"ok"}` and `GET /api/ready` → `200 {"status":"ready"}`, unchanged and without any Task API call (AC-001.8).

### Test seams

- Unit and component tests (Vitest) stub the Task API by stubbing global `fetch` (`vi.stubGlobal("fetch", ...)`) with `process.env.API_URL` set, for example `http://api.test`. They can assert the outgoing URL, method and body, and that no `POST` was sent. The page can be rendered with `render(await HomePage())`. `TaskBoard` can be rendered with a mocked `@/app/actions`.
- Playwright tests that need a stubbed API start a stub HTTP server and point `API_URL` at it before the app starts. Without `API_URL` the page shows the load-error message, which the read-only smoke test and `e2e/home.spec.ts` can rely on to find the h1 and the form.

## Data

None in this repo: the Task API owns the data.
