import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

vi.mock("@/app/actions", () => ({ createTaskAction: vi.fn() }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.API_URL = "http://api.test";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomePage", () => {
  it("renders the heading, the tasks and the create form", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: "1", title: "A", due_date: null }]), { status: 200 }));
    render(await HomePage());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Taskboard" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Create task" })).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    render(await HomePage());
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tasks" })).not.toBeInTheDocument();
  });

  it("shows the load error and still the form", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    render(await HomePage());
    expect(screen.getByText("Tasks could not be loaded. Please try again later.")).toBeInTheDocument();
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Create task" })).toBeInTheDocument();
  });
});
