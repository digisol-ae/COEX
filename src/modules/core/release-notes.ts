/**
 * What's new in COEX, newest first, in words for the people using it (John, 28 Sep 2026).
 *
 * Add a release at the top whenever something users will notice ships. The newest release's id is
 * what "I understand" records on a person's account, so a new entry at the top is all it takes for
 * the drawer to open by itself once more for everyone.
 */

export interface ReleaseNote {
  /** Stable and unique: stored on accounts that have acknowledged it. */
  id: string;
  date: string;
  title: string;
  sections: { heading: string; items: string[] }[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: '2026-10-01-d',
    date: '1 October 2026',
    title: 'See who created a task and who assigned it to you',
    sections: [
      {
        heading: 'Improvements',
        items: [
          'Every task now shows who created it and who assigned it to you, with the date: on the task page, in the quick preview and in the side panel.',
          'Assignments are recorded from today. Tasks assigned earlier show their creator; the person who assigned them was not recorded at the time.',
        ],
      },
    ],
  },
  {
    id: '2026-10-01-b',
    date: '1 October 2026',
    title: 'A Back button, task status on the task page, and the right tasks on every list',
    sections: [
      {
        heading: 'Improvements',
        items: [
          'A Back arrow at the top of every screen takes you to the screen you came from.',
          'Change a task’s status straight from the full task page, using the status at the top right.',
          'Tooltips near the edge of the screen now stay fully visible.',
          'Personal now shows only your personal tasks, and each Space shows only its own tasks.',
        ],
      },
    ],
  },
  {
    id: '2026-10-01',
    date: '1 October 2026',
    title: 'My Desk, Personal tasks and over 10 UI improvements',
    sections: [
      {
        heading: 'New',
        items: [
          'My Desk: pick the tasks you commit to today, then choose I am done. Finished tasks move to your Performance History; unfinished ones stay for tomorrow.',
          'The day closes automatically at 23:59, so your history is saved even if you forget.',
          'Personal tasks: a private list only you can see.',
          'Forgot your password? Reset it yourself from the sign in page.',
          'Each Space can now have its own task statuses.',
        ],
      },
      {
        heading: 'Improvements',
        items: [
          'Over 10 UI improvements, including tooltips on every action, larger and clearer icons and colours, quick task previews, easier closing of popups, and compact task cards on phones.',
          'Timesheets can be sorted and show daily and weekly totals.',
        ],
      },
    ],
  },
  {
    id: '2026-09-28',
    date: '28 September 2026',
    title: 'Timers you can place anywhere, and a lighter look',
    sections: [
      {
        heading: 'Timers',
        items: [
          'Timers now live in a small floating window of glass. Drag it anywhere; it stays there as you move between pages.',
          'Three sizes: the full window with today’s timers, a floating digital clock only, or a small bubble that shows a red dot while a timer runs.',
          'The timer button in the header opens and minimizes it.',
        ],
      },
      {
        heading: 'Tickets',
        items: [
          'Any open ticket can now be closed directly, without resolving it first.',
          'Status menus grey out the moves that are not possible, and say why if a change is refused.',
          'Raise ticket opens as a popup over the list instead of pushing the page down.',
        ],
      },
      {
        heading: 'Email',
        items: [
          'Three sending addresses: Standard for customers, Alert for staff alerts, and Admin for account emails.',
          'A new alert when a ticket arrives, for administrators only, the whole desk, or nobody.',
          'Queues have a proper signature editor, with your name and job title filled in automatically.',
          'Preview the acknowledgement, saved replies and signatures exactly as a customer will see them.',
        ],
      },
      {
        heading: 'Spaces',
        items: [
          'Archive a whole space with its folders, tasks and subtasks from Space settings, and restore it from Spaces, Archived spaces.',
        ],
      },
      {
        heading: 'Look and feel',
        items: [
          'The selected item on the left rail glows, and the menu sits on a soft sunset and rainbow background.',
          'Popups use frosted glass. Secondary buttons became small icons: hover over one to see what it does.',
          'Editing or removing time on the timesheet opens in a popup, and asks why the time changed.',
        ],
      },
    ],
  },
  {
    id: '2026-09-27',
    date: '27 September 2026',
    title: 'Themes, your profile, and passwords',
    sections: [
      {
        heading: 'Themes',
        items: [
          'Choose Sunset, Light or Dark from the theme button in the header. Your choice follows you to every device.',
          'Menu headings are bold, and the page you are on is marked with a red bar.',
        ],
      },
      {
        heading: 'Your account',
        items: [
          'Your avatar at the top right opens your menu: Edit profile, Arrange my menu, What’s new and Sign out.',
          'Edit your name and job title in My profile.',
          'Change your password through a link sent to your email, from My profile or with “Forgot your password?” on the sign-in page.',
          'Passwords need at least 12 characters. A few unrelated words make a strong one that is easy to remember.',
        ],
      },
    ],
  },
  {
    id: '2026-09-26',
    date: '26 September 2026',
    title: 'Tickets and tasks work as one',
    sections: [
      {
        heading: 'Tickets and tasks',
        items: [
          'A task raised from a ticket links back to it, and both share one internal conversation.',
          'Type @ in a note to mention a colleague; they get an email.',
          'My work on the dashboard lists your open tickets and tasks together, soonest due first, with a Tickets only / Tasks only filter.',
        ],
      },
      {
        heading: 'Time and menu',
        items: [
          'Changing or removing logged time asks for a reason, shown in that entry’s history.',
          'Arrange my menu lets you put the parts of COEX you use most at the top.',
        ],
      },
    ],
  },
  {
    id: '2026-09-25',
    date: '25 September 2026',
    title: 'COEX goes live for the team',
    sections: [
      {
        heading: 'Support desk',
        items: [
          'Emails to the support mailbox become tickets within seconds, and customer replies join their ticket.',
          'A red dot marks tickets where the customer has written since you last looked, and the Support icon counts them.',
          'The ticket list and ticket page refresh themselves every 30 seconds.',
          'Replies and the acknowledgement stay in one conversation in the customer’s Outlook.',
        ],
      },
    ],
  },
];

export const LATEST_RELEASE_ID = RELEASE_NOTES[0].id;
