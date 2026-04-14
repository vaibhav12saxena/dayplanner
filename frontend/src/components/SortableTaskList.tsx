import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import type { Task } from "@/types";
import { reorderTasks } from "@/api/client";

interface SortableTaskListProps {
  tasks: Task[];
  onMove?: (id: number, target: string) => void;
  onDelete?: (id: number) => void;
  onRequestApproval?: (id: number, target: "today" | "tomorrow") => void;
  onUpdate?: () => void;
  onReorder?: (tasks: Task[]) => void;
}

function SortableItem({
  task,
  onMove,
  onDelete,
  onRequestApproval,
  onUpdate,
}: {
  task: Task;
  onMove?: (id: number, target: string) => void;
  onDelete?: (id: number) => void;
  onRequestApproval?: (id: number, target: "today" | "tomorrow") => void;
  onUpdate?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      <button
        {...attributes}
        {...listeners}
        className="mt-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <TaskCard
          task={task}
          onMove={onMove}
          onDelete={onDelete}
          onRequestApproval={onRequestApproval}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}

export default function SortableTaskList({
  tasks: initialTasks,
  onMove,
  onDelete,
  onRequestApproval,
  onUpdate,
  onReorder,
}: SortableTaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);

  // Sync if parent changes tasks
  if (initialTasks !== tasks && initialTasks.map((t) => t.id).join(",") !== tasks.map((t) => t.id).join(",")) {
    setTasks(initialTasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    setTasks(reordered);
    onReorder?.(reordered);

    try {
      await reorderTasks(reordered.map((t) => t.id));
    } catch {
      // revert on failure
      setTasks(initialTasks);
    }
  };

  if (tasks.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((task) => (
            <SortableItem
              key={task.id}
              task={task}
              onMove={onMove}
              onDelete={onDelete}
              onRequestApproval={onRequestApproval}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
