import { getAllTasks } from "@/lib/services/tasks";
import { TaskQueueClient } from "@/components/dashboard/TaskQueueClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await getAllTasks();
  return <TaskQueueClient tasks={tasks} />;
}
