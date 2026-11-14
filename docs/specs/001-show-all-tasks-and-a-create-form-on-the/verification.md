# Verification — 001 Show all tasks and a create form on the Taskboard start page

**Result:** pass
**Commit:** 8240277 · **Base:** f920ebc · **Trace:** 8/8 criteria named by tests

| Criterion | Verdict | Tests | Implementation | Notes |
|---|---|---|---|---|
| AC-001.1 | met | `tests/tasks-page.test.tsx::AC-001.1 lists the tasks in API order with title and due date`; `tests/tasks-api.test.ts::AC-001.1 GETs /tasks and returns the tasks in the API's order` | `app/page.tsx:6`, `lib/tasks-api.ts:85-99`, `app/_components/task-board.tsx:61-72` | asserts 3 items, titles in API order, `2026-01-02` / "No due date" / `2026-12-31`; no sorting in the client |
| AC-001.2 | met | `tests/tasks-page.test.tsx::AC-001.2 shows 'No tasks yet' and the create form for an empty list`; `tests/tasks-api.test.ts::AC-001.2 returns an empty list for []` | `app/_components/task-board.tsx:57-58`, `:77-94` | asserts the text, no list, and the form with Title, Due date, Add task |
| AC-001.3 | met | `tests/task-board.test.tsx::AC-001.3 appends the created task ...`, `::AC-001.3 works without a due date ...`; `tests/actions.test.ts::AC-001.3 posts ...` (3 tests); `tests/tasks-api.test.ts::AC-001.3 POSTs title and due_date ...`, `::sends due_date null ...`; `tests/task-input.test.ts::AC-001.3 converts the date input ...` | `app/_components/task-board.tsx:20-43`, `app/actions.ts:7-10`, `lib/tasks-api.ts:101-116`, `lib/task-input.ts:8-10` | asserts POST body `{title:"Call Anna", due_date:"2026-03-04"|null}`, the task appended last, both inputs cleared; `waitFor` (1 s default) bounds the update well under 2 s; no reload (client state append) |
| AC-001.4 | met | `tests/task-board.test.tsx::AC-001.4 rejects a %s title ...` (empty, whitespace, 201 chars); `tests/actions.test.ts::AC-001.4 returns invalid without calling the API ...`; `tests/task-input.test.ts` (2 tests); `e2e/tasks.spec.ts::AC-001.4 an empty title shows the validation message` | `app/_components/task-board.tsx:23-26`, `app/actions.ts:8`, `lib/task-input.ts:3-6` | asserts the message, both values kept, action not called and `fetch` not called |
| AC-001.5 | met | `tests/task-board.test.tsx::AC-001.5 shows the title error on invalid ...`; `tests/actions.test.ts::AC-001.5 ...`; `tests/tasks-api.test.ts::AC-001.5 maps 422 to invalid` | `lib/tasks-api.ts:115`, `app/_components/task-board.tsx:40-41` | asserts message, values kept, list still 1 item |
| AC-001.6 | met | `tests/tasks-page.test.tsx::AC-001.6 ...` (503, 500, unreadable body, timeout, connection error); `tests/tasks-api.test.ts::AC-001.6 ...` (503, 404, bad bodies, 6 s fake-timer bound, unset API_URL); `tests/task-board.test.tsx::AC-001.6 ...`; `e2e/tasks.spec.ts::AC-001.6 the start page loads with 200 ...` | `lib/tasks-api.ts:17`, `:25-32`, `:85-99`, `app/page.tsx:5-15`, `app/_components/task-board.tsx:53-56` | e2e asserts status 200 and the message; units assert no list and no "No tasks yet" |
| AC-001.7 | met | `tests/task-board.test.tsx::AC-001.7 ...` (failed, thrown); `tests/actions.test.ts::AC-001.7 ...`; `tests/tasks-api.test.ts::AC-001.7 ...` (503, 200, bad 201 bodies, 6 s bound, timeout, connection error, unset API_URL); `e2e/tasks.spec.ts::AC-001.7 submitting while the Task API is down ...` | `lib/tasks-api.ts:101-116`, `app/_components/task-board.tsx:29-33`, `:40-41` | asserts the save message and both values kept |
| AC-001.8 | met | `tests/probes-api-down.test.ts::AC-001.8 ...`; `e2e/tasks.spec.ts::AC-001.8 the probes answer 200 ...` | `app/api/ready/route.ts:5-11` (comment only), `app/api/health/route.ts` unchanged | asserts 200 bodies and that `fetch` is never called |

## Non-goals

The spec lists no non-goals. Template-owned layout (`app/layout.tsx`: header, footer, navigation) is untouched; `app/globals.css` only appends task-board rules. ✔

## Deviations from the plan

- `app/_components/feature-card.tsx`, `app/_components/icons.tsx` deleted, in no task's `files`: dead starter code after t3 replaced the page; acceptable.
- `tests/*.test.ts[x]` (except `tests/page.test.tsx`) and `e2e/tasks.spec.ts`, in no task's `files`: the acceptance tests written before the build; acceptable.
- `docs/backlog.md`, spec dir docs: generated index and spec artefacts; acceptable (the generated row still says `approved`, refreshed by `cplat spec index`).
- `TaskBoard` props are `initialTasks` / `loadFailed` instead of the plan's `initial={result}`: design.md "Contract" does not fix the prop shape; acceptable.
- The 6 s timeout is built from `AbortController` + `setTimeout` raising `TimeoutError` (`lib/tasks-api.ts:25-32`) instead of `AbortSignal.timeout(6000)`: same behaviour, testable with fake timers; acceptable.
- t1 "done when" asks a unit test to show the `task_api_call_failed` log line; no test asserts the logger. The code logs every failure (`lib/tasks-api.ts:44-51`, called at `:59`, `:72`, `:90`, `:95`, `:111`, `:114`). No criterion depends on it; acceptable, but a log assertion should be added.

## Contract

Matches `design.md` and the system contract: server-side `API_URL` only (documented in `docs/env-vars.md`), `GET`/`POST /tasks` with JSON headers and `cache: "no-store"`, `due_date` always sent (null when empty), title sent untrimmed, no retry, submit disabled while pending. ✔

## Smoke

- `e2e/home.spec.ts` "home page renders with its landmarks": `getByRole("heading", { name: "Taskboard" })` is a case-insensitive substring match in Playwright, so it also matches the starter's `taskboard16-web` h1 and passes without the feature (use `exact: true`).

## Mutation check (report only)

Skipped: no mutation check for shape web-nextjs yet.
