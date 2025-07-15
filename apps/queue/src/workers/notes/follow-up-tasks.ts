import { NoteWorkerDependencies } from "./types";
import { ErrorType, ErrorSeverity } from "../../types";

export async function queueFollowUpProcessingTasks(
  note: { id: string },
  file: { title: string },
  jobId: string,
  deps: Pick<
    NoteWorkerDependencies,
    | "ingredientQueue"
    | "instructionQueue"
    | "imageQueue"
    | "categorizationQueue"
    | "ErrorHandler"
  >
): Promise<void> {
  const followUpTasks = [
    {
      queue: deps.ingredientQueue,
      name: "parse-ingredients",
      data: { note },
      priority: 1,
    },
    {
      queue: deps.instructionQueue,
      name: "parse-instructions",
      data: { note },
      priority: 1,
    },
    {
      queue: deps.imageQueue,
      name: "process-image",
      data: { noteId: note.id, file },
      priority: 2,
    },
    {
      queue: deps.categorizationQueue,
      name: "categorize-recipe",
      data: { noteId: note.id, file },
      priority: 3,
    },
  ];

  for (const task of followUpTasks) {
    try {
      await task.queue.add(task.name, task.data, {
        priority: task.priority,
      });
    } catch (error) {
      const subTaskError = deps.ErrorHandler.createJobError(
        error as Error,
        ErrorType.REDIS_ERROR,
        ErrorSeverity.MEDIUM,
        {
          jobId,
          subTask: task.name,
          queueName: task.queue.name,
          operation: "add_sub_task",
        }
      );
      deps.ErrorHandler.logError(subTaskError);
    }
  }
}
