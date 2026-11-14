import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTaskAction } from "@/app/actions";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.API_URL = "http://api.test";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createTaskAction", () => {
  it("AC-001.4 returns invalid without calling the API for a bad title", async () => {
    for (const title of ["", "   ", "a".repeat(201)]) {
      expect(await createTaskAction({ title, due_date: "" })).toEqual({ kind: "invalid" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AC-001.3 posts the title as entered with a null due_date for an empty date", async () => {
    const task = { id: "1", title: "Call Anna", due_date: null };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(task), { status: 201 }));
    expect(await createTaskAction({ title: "Call Anna", due_date: "" })).toEqual({ kind: "created", task });
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: "Call Anna", due_date: null });
  });

  it("AC-001.3 posts a title with surrounding spaces exactly as entered", async () => {
    const task = { id: "1", title: "  Call Anna ", due_date: null };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(task), { status: 201 }));
    await createTaskAction({ title: "  Call Anna ", due_date: "" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).title).toBe("  Call Anna ");
  });

  it("AC-001.3 posts a YYYY-MM-DD due date", async () => {
    const task = { id: "1", title: "Call Anna", due_date: "2026-03-04" };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(task), { status: 201 }));
    await createTaskAction({ title: "Call Anna", due_date: "2026-03-04" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: "Call Anna", due_date: "2026-03-04" });
  });

  it("AC-001.5 returns invalid when the API answers 422", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 422 }));
    expect(await createTaskAction({ title: "x", due_date: "" })).toEqual({ kind: "invalid" });
  });

  it("AC-001.7 returns failed when the API answers 503", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    expect(await createTaskAction({ title: "x", due_date: "" })).toEqual({ kind: "failed" });
  });
});
