import { listTasks } from "@/lib/tasks-api";

import { TaskBoard } from "./_components/task-board";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await listTasks();
  return (
    <>
      <section className="hero board-hero">
        <h1 className="hero-title">Taskboard</h1>
      </section>
      <TaskBoard initialTasks={result.ok ? result.tasks : []} loadFailed={!result.ok} />
    </>
  );
}
