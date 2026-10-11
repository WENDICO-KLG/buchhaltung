import type { Todo, TodoPriority } from "../types/index.ts";

export const priorityLabels: Record<TodoPriority, string> = { high: "Hoch", normal: "Normal", low: "Niedrig" };
const priorityRank: Record<TodoPriority, number> = { high: 0, normal: 1, low: 2 };

export function compareTodoPriority(left: Todo, right: Todo, today: string) {
  const overdue = (todo: Todo) => Boolean(todo.status !== "done" && todo.dueDate && todo.dueDate < today);
  return Number(overdue(right)) - Number(overdue(left))
    || priorityRank[left.priority ?? "normal"] - priorityRank[right.priority ?? "normal"]
    || (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31")
    || right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id);
}