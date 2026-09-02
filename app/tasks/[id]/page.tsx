import { notFound } from "next/navigation";
import { getTask } from "@/lib/mock-data";
import { TaskWorkbench } from "@/components/task-workbench";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) notFound();
  return <TaskWorkbench task={task} />;
}
