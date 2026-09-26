import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { UserModel } from '../models/user.model';
import { alertStaff } from './email.service';

/**
 * @mentions in internal notes.
 *
 * The picker in the browser sends the ids of the people chosen alongside the text. Only an id whose
 * "@Name" is still in the text counts, so deleting a mention before posting also cancels its email,
 * and a hand-typed name that was never picked alerts nobody.
 */

const users = () => repository(UserModel);

export interface MentionableUser {
  id: string;
  name: string;
}

/** Staff who can be mentioned. Customers are never offered: notes are internal. */
export async function mentionableUsers(onlyIds?: string[] | null): Promise<MentionableUser[]> {
  await connectToDatabase();
  const found = await users()
    .find({
      status: 'active',
      role: { $ne: 'client_contact' },
      ...(onlyIds ? { _id: { $in: onlyIds } } : {}),
    })
    .select('name')
    .sort({ name: 1 });
  return found.map((user) => ({ id: String(user._id), name: user.name }));
}

/** Which of the chosen people are still mentioned in the text as posted. */
export function mentionedIn(
  body: string,
  chosenIds: string[],
  candidates: MentionableUser[],
): MentionableUser[] {
  const chosen = new Set(chosenIds);
  return candidates.filter((user) => chosen.has(user.id) && body.includes(`@${user.name}`));
}

/**
 * Emails everyone mentioned. A failed alert never stops the note itself from saving, because the
 * note is the record and the email only points at it.
 */
export async function alertMentioned(input: {
  body: string;
  chosenIds: string[];
  candidates: MentionableUser[];
  subject: string;
  where: string;
  link: string;
  authorName: string;
}): Promise<void> {
  for (const user of mentionedIn(input.body, input.chosenIds, input.candidates)) {
    try {
      await alertStaff('mentioned', user.id, input.subject, [
        `${input.authorName} mentioned you on ${input.where}:`,
        '',
        input.body,
        '',
        input.link,
      ]);
    } catch (error) {
      console.error('Mention alert skipped:', error instanceof Error ? error.message : error);
    }
  }
}
