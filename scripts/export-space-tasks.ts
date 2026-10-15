/**
 * Prints the open tasks of one space as Markdown, so a team's feedback kept as tasks can be read
 * outside COEX (John, 15 Oct 2026: the QA space holds the team's feedback). Read only: nothing is
 * written to the database.
 *
 *   npx tsx --env-file=.env scripts/export-space-tasks.ts            (QA space, To do and In progress)
 *   SPACE_NAME=QA STATUSES="To do,In progress" npx tsx --env-file=.env scripts/export-space-tasks.ts
 *   ... > qa-tasks.md
 *
 * On the server the variables live in /srv/coex/app/.env; on a Mac, .env.local. Status names are
 * compared without regard to case, because each space configures its own columns.
 */

import mongoose from 'mongoose';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { FolderModel } from '@coex/shared/tasks/models/folder.model';
import { TaskCommentModel } from '@coex/shared/tasks/models/task-comment.model';
import { UserModel } from '@coex/shared/core/models/user.model';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Run with --env-file=.env (or .env.local).');

  const spaceName = (process.env.SPACE_NAME ?? 'QA').trim();
  const wanted = (process.env.STATUSES ?? 'To do,In progress')
    .split(',')
    .map((status) => status.trim().toLowerCase())
    .filter(Boolean);

  await mongoose.connect(uri, process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {});
  console.error('Connected to', mongoose.connection.name);

  const escaped = spaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const spaces = await SpaceModel.find({ name: new RegExp(`^${escaped}$`, 'i') });
  if (spaces.length === 0) throw new Error(`No space named "${spaceName}".`);

  for (const space of spaces) {
    const tasks = (await TaskModel.find({ spaceId: space._id, deletedAt: null })).filter((task) =>
      wanted.includes(String(task.status).toLowerCase()),
    );
    const folders = new Map(
      (await FolderModel.find({ spaceId: space._id })).map((folder) => [
        String(folder._id),
        folder.name,
      ]),
    );
    const people = new Map(
      (await UserModel.find({}).select('name')).map((user) => [String(user._id), user.name]),
    );
    const comments = await TaskCommentModel.find({ taskId: { $in: tasks.map((t) => t._id) } }).sort(
      { createdAt: 1 },
    );

    console.log(`# ${space.name}: ${tasks.length} task(s) in ${wanted.join(', ')}\n`);

    for (const task of tasks) {
      const assignees = task.assigneeIds.map((id) => people.get(String(id)) ?? String(id));
      console.log(`## ${task.number} ${task.title}`);
      console.log(
        `Status: ${task.status} | Priority: ${task.priority} | Folder: ${
          task.folderId ? (folders.get(String(task.folderId)) ?? '?') : 'none'
        } | Assignees: ${assignees.join(', ') || 'none'} | Created: ${
          people.get(String(task.createdById)) ?? '?'
        }`,
      );
      if (task.description) console.log(`\n${task.description}`);

      for (const comment of comments.filter((c) => String(c.taskId) === String(task._id))) {
        console.log(`\n> ${comment.authorName}: ${comment.body.replace(/\n/g, '\n> ')}`);
      }
      console.log('');
    }
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
