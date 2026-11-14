import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTaskAction } from "@/app/actions";
import { TaskBoard } from "@/app/_components/task-board";

vi.mock("@/app/actions", () => ({ createTaskAction: vi.fn() }));

const action = vi.mocked(createTaskAction);

const TITLE_ERROR = "Title must be 1 to 200 characters";
const SAVE_ERROR = "The task could not be saved. Please try again.";

// Assumed prop shape (design.md leaves it open): initial tasks and a load-failed flag.
function board(initialTasks: { id: string; title: string; due_date: string | null }[] = [], loadFailed = false) {
  return render(<TaskBoard initialTasks={initialTasks} loadFailed={loadFailed} />);
}

function form() {
  return screen.getByRole("form", { name: "Create task" });
}

function fill(title: string, due = "") {
  fireEvent.change(within(form()).getByLabelText("Title"), { target: { value: title } });
  fireEvent.change(within(form()).getByLabelText("Due date"), { target: { value: due } });
}

function submit() {
  fireEvent.submit(form());
}

beforeEach(() => {
  action.mockReset();
});

describe("TaskBoard", () => {
  it("AC-001.3 appends the created task to the end of the list and clears the form", async () => {
    action.mockResolvedValue({ kind: "created", task: { id: "9", title: "Call Anna", due_date: "2026-03-04" } });
    board([{ id: "1", title: "Existing", due_date: null }]);
    fill("Call Anna", "2026-03-04");
    submit();
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(action).toHaveBeenCalledWith({ title: "Call Anna", due_date: "2026-03-04" });
    const items = within(screen.getByRole("list", { name: "Tasks" })).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByTestId("task-title").textContent)).toEqual(["Existing", "Call Anna"]);
    expect(within(items[1]).getByTestId("task-due")).toHaveTextContent("2026-03-04");
    expect(within(form()).getByLabelText("Title")).toHaveValue("");
    expect(within(form()).getByLabelText("Due date")).toHaveValue("");
  });

  it("AC-001.3 works without a due date and replaces 'No tasks yet'", async () => {
    action.mockResolvedValue({ kind: "created", task: { id: "9", title: "Call Anna", due_date: null } });
    board([]);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    fill("Call Anna");
    submit();
    await waitFor(() => expect(screen.getByRole("list", { name: "Tasks" })).toBeInTheDocument());
    expect(action).toHaveBeenCalledWith({ title: "Call Anna", due_date: "" });
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    expect(screen.getByTestId("task-due")).toHaveTextContent("No due date");
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["too long", "a".repeat(201)],
  ])("AC-001.4 rejects a %s title without calling the action and keeps the values", async (_n, title) => {
    board([]);
    fill(title, "2026-03-04");
    submit();
    expect(await within(form()).findByRole("alert")).toHaveTextContent(TITLE_ERROR);
    expect(action).not.toHaveBeenCalled();
    expect(within(form()).getByLabelText("Title")).toHaveValue(title);
    expect(within(form()).getByLabelText("Due date")).toHaveValue("2026-03-04");
  });

  it("AC-001.5 shows the title error on invalid, keeps values and the list", async () => {
    action.mockResolvedValue({ kind: "invalid" });
    board([{ id: "1", title: "Existing", due_date: null }]);
    fill("Call Anna", "2026-03-04");
    submit();
    expect(await within(form()).findByRole("alert")).toHaveTextContent(TITLE_ERROR);
    expect(within(form()).getByLabelText("Title")).toHaveValue("Call Anna");
    expect(within(form()).getByLabelText("Due date")).toHaveValue("2026-03-04");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("AC-001.7 shows the save error on failed, keeps values and the list", async () => {
    action.mockResolvedValue({ kind: "failed" });
    board([{ id: "1", title: "Existing", due_date: null }]);
    fill("Call Anna", "2026-03-04");
    submit();
    expect(await within(form()).findByRole("alert")).toHaveTextContent(SAVE_ERROR);
    expect(within(form()).getByLabelText("Title")).toHaveValue("Call Anna");
    expect(within(form()).getByLabelText("Due date")).toHaveValue("2026-03-04");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("AC-001.7 treats a thrown action error as failed", async () => {
    action.mockRejectedValue(new Error("network"));
    board([]);
    fill("Call Anna");
    submit();
    expect(await within(form()).findByRole("alert")).toHaveTextContent(SAVE_ERROR);
    expect(within(form()).getByLabelText("Title")).toHaveValue("Call Anna");
  });

  it("AC-001.6 shows the load error instead of the list and still renders the form", () => {
    board([], true);
    expect(screen.getByText("Tasks could not be loaded. Please try again later.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tasks" })).not.toBeInTheDocument();
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    expect(form()).toBeInTheDocument();
  });
});
