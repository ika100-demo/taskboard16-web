"use server";

import { isValidTitle, toDueDate } from "@/lib/task-input";
import { createTask } from "@/lib/tasks-api";
import type { CreateTaskResult } from "@/lib/tasks-api";

export async function createTaskAction(input: { title: string; due_date: string }): Promise<CreateTaskResult> {
  if (typeof input?.title !== "string" || !isValidTitle(input.title)) return { kind: "invalid" };
  const due = typeof input.due_date === "string" ? input.due_date : "";
  return createTask({ title: input.title, due_date: toDueDate(due) });
}
