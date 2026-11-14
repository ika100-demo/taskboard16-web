"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { createTaskAction } from "@/app/actions";
import { isValidTitle } from "@/lib/task-input";
import type { CreateTaskResult, Task } from "@/lib/tasks-api";

export type TaskBoardProps = { initialTasks: Task[]; loadFailed: boolean };

const TITLE_ERROR = "Title must be 1 to 200 characters";
const SAVE_ERROR = "The task could not be saved. Please try again.";
const LOAD_ERROR = "Tasks could not be loaded. Please try again later.";

export function TaskBoard({ initialTasks, loadFailed }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!isValidTitle(title)) {
      setMessage(TITLE_ERROR);
      return;
    }
    setPending(true);
    let result: CreateTaskResult;
    try {
      result = await createTaskAction({ title, due_date: dueDate });
    } catch {
      result = { kind: "failed" };
    }
    setPending(false);
    if (result.kind === "created") {
      setTasks((prev) => [...prev, result.task]);
      setTitle("");
      setDueDate("");
      setMessage(null);
    } else {
      setMessage(result.kind === "invalid" ? TITLE_ERROR : SAVE_ERROR);
    }
  }

  return (
    <>
      <section className="section" aria-labelledby="tasks-title">
        <div className="section-head">
          <h2 id="tasks-title" className="section-title">
            Tasks
          </h2>
        </div>
        {loadFailed ? (
          <p role="alert" className="task-state task-error">
            {LOAD_ERROR}
          </p>
        ) : tasks.length === 0 ? (
          <p className="task-state">No tasks yet</p>
        ) : null}
        {tasks.length > 0 && (
          <ul aria-label="Tasks" className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-item">
                <span className="task-title" data-testid="task-title">
                  {task.title}
                </span>
                <span className="task-due" data-testid="task-due">
                  {task.due_date ?? "No due date"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-label="New task">
        <form aria-label="Create task" className="task-form" onSubmit={onSubmit} noValidate>
          <label className="task-field">
            <span>Title</span>
            <input type="text" name="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="task-field">
            <span>Due date</span>
            <input type="date" name="due_date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            Add task
          </button>
          {message && (
            <p role="alert" className="task-error">
              {message}
            </p>
          )}
        </form>
      </section>
    </>
  );
}
