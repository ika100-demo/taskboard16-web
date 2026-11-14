import { logger } from "@/lib/logger";

export type Task = { id: string; title: string; due_date: string | null };

export type ListTasksResult = { ok: true; tasks: Task[] } | { ok: false };

export type CreateTaskInput = { title: string; due_date: string | null };
export type CreateTaskResult =
  | { kind: "created"; task: Task }
  | { kind: "invalid" }
  | { kind: "failed" };

type Method = "GET" | "POST";
type FailStatus = number | "timeout" | "connection_error";
type Reason = "invalid_body" | "api_url_unset";

const TIMEOUT_MS = 6000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Equivalent of AbortSignal.timeout(6000) (aborts with a TimeoutError), built on
 * setTimeout so that fake timers can drive it in tests. Aborting after the call
 * has finished is harmless; the timer is unref'd so it never holds the process.
 */
function timeoutSignal(): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("The operation timed out.", "TimeoutError"));
  }, TIMEOUT_MS);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
  return controller.signal;
}

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    (v.due_date === null || (typeof v.due_date === "string" && DATE_RE.test(v.due_date)))
  );
}

function logFailure(method: Method, status: FailStatus, reason?: Reason): void {
  logger.warn("task_api_call_failed", {
    method,
    path: "/tasks",
    status,
    ...(reason ? { reason } : {}),
  });
}

type CallResult = { response: Response } | { error: FailStatus };

/** Calls the Task API; returns the response or the failure status. Never throws. */
async function call(method: Method, init: RequestInit): Promise<CallResult> {
  const base = process.env.API_URL?.replace(/\/$/, "");
  if (!base) {
    logFailure(method, "connection_error", "api_url_unset");
    return { error: "connection_error" };
  }
  try {
    const response = await fetch(`${base}/tasks`, {
      ...init,
      method,
      cache: "no-store",
      signal: timeoutSignal(),
    });
    return { response };
  } catch (err) {
    const status = err instanceof Error && err.name === "TimeoutError" ? "timeout" : "connection_error";
    logFailure(method, status);
    return { error: status };
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function listTasks(): Promise<ListTasksResult> {
  const result = await call("GET", { headers: { Accept: "application/json" } });
  if ("error" in result) return { ok: false };
  const { response } = result;
  if (response.status !== 200) {
    logFailure("GET", response.status);
    return { ok: false };
  }
  const body = await readJson(response);
  if (!Array.isArray(body) || !body.every(isTask)) {
    logFailure("GET", 200, "invalid_body");
    return { ok: false };
  }
  return { ok: true, tasks: body };
}

export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  const result = await call("POST", {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ title: input.title, due_date: input.due_date }),
  });
  if ("error" in result) return { kind: "failed" };
  const { response } = result;
  if (response.status === 201) {
    const body = await readJson(response);
    if (isTask(body)) return { kind: "created", task: body };
    logFailure("POST", 201, "invalid_body");
    return { kind: "failed" };
  }
  logFailure("POST", response.status);
  return response.status === 422 ? { kind: "invalid" } : { kind: "failed" };
}
