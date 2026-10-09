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
    id: '2026-10-09',
    date: '9 October 2026',
    title: 'Leads, tickets, folders and time',
    sections: [
      {
        heading: 'Tickets',
        items: [
          'Click a ticket subject to open its quick preview, the same way a task title opens its panel. The eye icon is gone. The preview has a full screen icon that opens the whole ticket.',
          'Drag tickets in the list to put them in your own order. The order is yours alone and does not change anyone else\'s list. Sorting a column pauses dragging, and "Reset my order" puts the list back to latest activity first.',
        ],
      },
      {
        heading: 'Folders',
        items: [
          'A folder can now be archived from its settings (the gear beside the folder). Choose to keep its tasks in the space, or to archive the folder together with its tasks. Nothing is deleted for good, logged time is kept, and a running timer stops the archive.',
        ],
      },
      {
        heading: 'Time',
        items: [
          'New Team activity page under Time, for people who can see everyone\'s hours: who is working on which task or ticket, the stage it is in, the time they put on it, and a "working now" mark. Filter by days, stage or status, and person.',
          'New time entries are no longer marked billable by default. Tick Billable on the entries that are. Entries already saved keep their setting.',
          "The Time section of a task now lists time entries person by person, each with its date and note. People who may see everyone's timesheets see every person; everyone else sees their own entries.",
        ],
      },
      {
        heading: 'Leads',
        items: [
          'A new Leads page under CRM keeps track of possible customers before they are qualified. Add a lead with its name, company, email, mobile number, source and owner. A lead gets a number such as L-1.',
          'You see the leads you own; managers and administrators see every lead and can filter by owner. Filters with counts show New, Working, Converted and Disqualified leads, and you can search by name, company or email.',
          'If a new lead has the same email, mobile number or company as an existing lead, customer or contact, COEX tells you who it looks like. You can still save it as a new lead.',
          'Mark a lead as working when you start on it. To drop one, disqualify it and say why: the lead stays in the list with your reason, and can be reopened.',
          'Where leads come from is a list you can edit under Setup, Tenant settings. Custom fields can now be added to leads under Setup, Custom fields. Administrators decide who works on leads in Users and roles.',
        ],
      },
    ],
  },
  {
    id: '2026-10-04',
    date: '4 October 2026',
    title: 'Contracts',
    sections: [
      {
        heading: 'Contracts',
        items: [
          'A new Contracts page under CRM lists annual maintenance agreements and other contracts for managers and administrators. Add a contract for a customer with its dates, how often it is billed (monthly, every two months, quarterly or yearly), the amount and currency, the products it covers and a link to the signed document.',
          "A contract shows Expiring when fewer days remain than the customer's warning period (30 by default; change it on the customer under Contract expiry warning) and Expired after its end date.",
          'Renew an active contract with the renew icon: it prepares a draft for the next term, and activating the draft retires the old contract. Contracts that are expiring or have ended are listed at the top of the page.',
          "The contract owner (the customer's owner, or the administrators when there is none) gets an email 60 and 30 days before a contract ends. Switch this on or off under Setup, Email.",
          'Open a contract to see its billing schedule: each period, when its invoice is due, and a "Mark invoiced" tick once finance has invoiced it in Zoho Books. Contracts that count support time show the hours used and left in the current period, as a warning only.',
          "On a ticket, agents now see a notice when the customer's contract is about to end, has ended, or does not exist. When a customer's contract is ending or has ended, the automatic acknowledgement email tells them.",
          'A red number on the CRM icon and beside Contracts counts the contracts that are expiring or have ended. Click it to see just those. The Contracts page has filters with counts: Needs renewal, Expiring in 30 days, Expiring in 60 days and Expired.',
          'Each contract row has an email button that sends a message to the contacts chosen on the contract, one personal email each. Pick a template (renewal reminder, contract ended or general), change the words if you like and check the preview. The templates and a separate Contracts sender address are set under Setup, Email.',
          'If a product is not listed yet, add it from the contract form. Invoices and payments stay in Zoho Books.',
        ],
      },
    ],
  },
  {
    id: '2026-10-03',
    date: '3 October 2026',
    title: 'Ticket improvements, task origins and WhatsApp preparation',
    sections: [
      {
        heading: 'Tickets',
        items: [
          'The ticket scope filters are now colored analytics buttons: Opened (active tickets), Delayed (SLA due within an hour) and Missed (SLA breached). Click a count to see those tickets.',
          'Create a customer directly from the Customer dropdown using their name and email. The saved customer is selected without leaving your ticket draft; edit their details later in Customers.',
          'Add multiple CC collaborators from team, customer or branch contacts, or enter email addresses. Save changes on an existing ticket before replying. Public reply emails include CC; internal notes stay private.',
          'Drop files onto a new ticket or reply, or click to attach. Adding files one by one keeps earlier selections. Each selected file shows an icon, name, size and remove button.',
          'Use the eye icon to preview a ticket without leaving the screen. Compact icon-and-value chips, short message excerpts and hidden empty fields keep the preview small. Open the full ticket from the preview when needed.',
          'The running ticket timer shows a live HH:MM:SS clock next to Stop timer.',
          'Choose a configured sending email in Reply to customer. The current Standard sender remains the default.',
          'When no individual contact or requester email is recorded, public replies use the selected customer’s email address.',
        ],
      },
      {
        heading: 'Tasks',
        items: [
          'To do tasks are yellow; in-progress tasks are blue in task lists and panels.',
          'The Tasks badge counts your visible open assigned tasks. Click the Tasks icon to open that exact list; its tooltip explains the count.',
          'The task creator stays fixed. The editable people field is labelled Assignees, and tasks can still be reassigned.',
          'Tasks show who created them and who assigned them to you, with the date, on the task page, quick preview and side panel. Older assignments whose origin was never recorded are not guessed.',
        ],
      },
      {
        heading: 'WhatsApp preparation',
        items: [
          'Setup, WhatsApp has configuration and test-mode tools for the Support and CRM numbers. Live connectivity still requires configuration.',
          'Support incoming-message handling is prepared: match known mobile numbers, retain unknown sender names and numbers, thread messages into open tickets, and queue a Ticket received acknowledgement when connected. CRM conversations and further WhatsApp reply features remain pending.',
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
