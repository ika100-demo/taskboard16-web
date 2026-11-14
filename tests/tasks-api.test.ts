import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTask, listTasks } from "@/lib/tasks-api";

const T1 = { id: "1", title: "First", due_date: "2026-01-02" };
const T2 = { id: "2", title: "Second", due_date: null };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.API_URL = "http://api.test/";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("listTasks", () => {
  it("AC-001.1 GETs /tasks and returns the tasks in the API's order", async () => {
    fetchMock.mockResolvedValue(json([T2, T1, { ...T1, id: "3", extra: true }]));
    const result = await listTasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://api.test/tasks");
    expect((init?.method ?? "GET").toUpperCase()).toBe("GET");
    expect(init?.cache).toBe("no-store");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks.map((t) => t.id)).toEqual(["2", "1", "3"]);
  });

  it("AC-001.2 returns an empty list for []", async () => {
    fetchMock.mockResolvedValue(json([]));
    expect(await listTasks()).toEqual({ ok: true, tasks: [] });
  });

  it.each([
    ["503", () => json({}, 503)],
    ["404", () => json([], 404)],
    ["unreadable body", () => new Response("<html>", { status: 200 })],
    ["not an array", () => json({ tasks: [] })],
    ["invalid element", () => json([T1, { id: "x", title: 5, due_date: null }])],
    ["bad due_date", () => json([{ id: "x", title: "t", due_date: "02.01.2026" }])],
  ])("AC-001.6 gives ok:false for %s", async (_name, make) => {
    fetchMock.mockResolvedValue(make());
    expect(await listTasks()).toEqual({ ok: false });
  });

  it("AC-001.6 gives ok:false on a timeout and on a connection error", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    expect(await listTasks()).toEqual({ ok: false });
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await listTasks()).toEqual({ ok: false });
  });

  it("AC-001.6 gives ok:false when API_URL is unset", async () => {
    delete process.env.API_URL;
    expect(await listTasks()).toEqual({ ok: false });
  });
});

describe("createTask", () => {
  it("AC-001.3 POSTs title and due_date and returns the created task", async () => {
    fetchMock.mockResolvedValue(json({ id: "9", title: "Call Anna", due_date: "2026-03-04" }, 201));
    const result = await createTask({ title: "Call Anna", due_date: "2026-03-04" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://api.test/tasks");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ title: "Call Anna", due_date: "2026-03-04" });
    expect(result).toEqual({ kind: "created", task: { id: "9", title: "Call Anna", due_date: "2026-03-04" } });
  });

  it("AC-001.3 sends due_date null when there is none", async () => {
    fetchMock.mockResolvedValue(json({ id: "9", title: "Call Anna", due_date: null }, 201));
    await createTask({ title: "Call Anna", due_date: null });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toHaveProperty("due_date", null);
  });

  it("AC-001.5 maps 422 to invalid", async () => {
    fetchMock.mockResolvedValue(json({ detail: "x" }, 422));
    expect(await createTask({ title: "x", due_date: null })).toEqual({ kind: "invalid" });
  });

  it.each([
    ["503", () => json({}, 503)],
    ["200", () => json(T1, 200)],
    ["201 with invalid body", () => json({ nope: 1 }, 201)],
    ["201 with unreadable body", () => new Response("x", { status: 201 })],
  ])("AC-001.7 maps %s to failed", async (_n, make) => {
    fetchMock.mockResolvedValue(make());
    expect(await createTask({ title: "x", due_date: null })).toEqual({ kind: "failed" });
  });

  it("AC-001.7 maps a timeout, a connection error and a missing API_URL to failed", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    expect(await createTask({ title: "x", due_date: null })).toEqual({ kind: "failed" });
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await createTask({ title: "x", due_date: null })).toEqual({ kind: "failed" });
    delete process.env.API_URL;
    expect(await createTask({ title: "x", due_date: null })).toEqual({ kind: "failed" });
  });
});
