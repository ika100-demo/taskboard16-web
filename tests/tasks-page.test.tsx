import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

vi.mock("@/app/actions", () => ({ createTaskAction: vi.fn() }));

const LOAD_ERROR = "Tasks could not be loaded. Please try again later.";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.API_URL = "http://api.test";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function renderPage() {
  render(await HomePage());
}

describe("start page", () => {
  it("AC-001.1 lists the tasks in API order with title and due date", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: "1", title: "Oldest", due_date: "2026-01-02" },
          { id: "2", title: "Middle", due_date: null },
          { id: "3", title: "Newest", due_date: "2026-12-31" },
        ]),
        { status: 200 },
      ),
    );
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Taskboard" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Tasks" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((li) => within(li).getByTestId("task-title").textContent)).toEqual(["Oldest", "Middle", "Newest"]);
    expect(items.map((li) => within(li).getByTestId("task-due").textContent)).toEqual(["2026-01-02", "No due date", "2026-12-31"]);
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
  });

  it("AC-001.2 shows 'No tasks yet' and the create form for an empty list", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    await renderPage();
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tasks" })).not.toBeInTheDocument();
    const form = screen.getByRole("form", { name: "Create task" });
    expect(within(form).getByLabelText("Title")).toBeInTheDocument();
    expect(within(form).getByLabelText("Due date")).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: "Add task" })).toBeInTheDocument();
  });

  it.each([
    ["503", () => new Response("{}", { status: 503 })],
    ["500", () => new Response("{}", { status: 500 })],
    ["unreadable body", () => new Response("<html>", { status: 200 })],
  ])("AC-001.6 shows the load error for %s and keeps the form", async (_n, make) => {
    fetchMock.mockResolvedValue(make());
    await renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
    expect(screen.queryByRole("list", { name: "Tasks" })).not.toBeInTheDocument();
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Create task" })).toBeInTheDocument();
  });

  it("AC-001.6 shows the load error on a timeout or connection error", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    await renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
  });
});
