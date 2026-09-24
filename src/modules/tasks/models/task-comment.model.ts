import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Internal progress notes on a task.
 *
 * They deliberately live separately from the task document: a long-running task can collect many
 * updates without making every board read load its full conversation history.
 */
const taskCommentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    body: { type: String, required: true, trim: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
  },
  { timestamps: true },
);

taskCommentSchema.index({ tenantId: 1, taskId: 1, createdAt: 1 });

export type TaskComment = InferSchemaType<typeof taskCommentSchema>;

export const TaskCommentModel: Model<TaskComment> =
  (models.TaskComment as Model<TaskComment>) ?? model<TaskComment>('TaskComment', taskCommentSchema);
