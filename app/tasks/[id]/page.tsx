import { notFound } from "next/navigation";
import { getTask } from "@/lib/mock-data";
import { TaskWorkbench } from "@/components/task-workbench";
import { LocalTaskPage } from "@/components/local-task-page";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id.startsWith("local-task-")) return <LocalTaskPage taskId={id} />;
  const task = getTask(id);
  if (!task) notFound();
  return <TaskWorkbench task={task} />;
}
