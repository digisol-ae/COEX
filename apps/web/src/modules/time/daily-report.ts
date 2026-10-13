/**
 * The daily performance email (John, 10 Oct 2026): at nine each morning every agent is told how
 * much time they logged the working day before, and a combined summary goes to the people who
 * manage them. Pure functions here, so the wording and the rules are tested without a database.
 *
 * Tone matters more than anything else in these emails. A person who logged enough is thanked.
 * A person who logged little, or nothing, is asked politely to log their work honestly, and is
 * encouraged; it is never an accusation, because the likeliest reason is a forgotten timer.
 */

const GULF = 'Asia/Dubai';

/** The date and hour in the Gulf, where the office works. */
export function gulfNow(now: Date = new Date()): { dayKey: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: GULF,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return { dayKey: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export function previousDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** 0 is Sunday, matching the tenant's working calendar. */
export function isWorkingDay(dayKey: string, workingDays: number[]): boolean {
  return workingDays.includes(new Date(`${dayKey}T00:00:00Z`).getUTCDay());
}

export function dayLabel(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export type DayOutcome = 'met' | 'below' | 'none';

export function classifyDay(minutes: number, minimumMinutes: number): DayOutcome {
  if (minutes <= 0) return 'none';
  return minutes >= minimumMinutes ? 'met' : 'below';
}

export function hoursText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export interface AgentDay {
  name: string;
  minutes: number;
  /** How many different tasks and tickets the time was logged on. */
  items: number;
}

export function agentEmail(
  day: string,
  agent: AgentDay,
  minimumMinutes: number,
): { subject: string; text: string } {
  const outcome = classifyDay(agent.minutes, minimumMinutes);
  const first = agent.name.split(' ')[0] || agent.name;
  const when = dayLabel(day);
  const subject = `Your time on ${when}`;

  if (outcome === 'met') {
    return {
      subject,
      text: [
        `Dear ${first},`,
        '',
        `Thank you. On ${when} you logged ${hoursText(agent.minutes)} across ${agent.items} ${agent.items === 1 ? 'task or ticket' : 'tasks and tickets'}.`,
        'Logging your work this carefully is what lets the team plan well and be fair to each other, and it is appreciated.',
        '',
        'Please keep it up.',
        '',
        'Kind regards,',
        'COEX',
      ].join('\n'),
    };
  }

  if (outcome === 'below') {
    return {
      subject,
      text: [
        `Dear ${first},`,
        '',
        `On ${when} you logged ${hoursText(agent.minutes)}, a little under the ${hoursText(minimumMinutes)} we hope to see for a working day.`,
        'If you worked on more than that, please add the missing time to your timesheet. If something got in the way, that is fine to note too.',
        'We trust you, and an honest log of your day is all we ask. You are doing important work and we want it to be seen.',
        '',
        'Thank you,',
        'COEX',
      ].join('\n'),
    };
  }

  return {
    subject,
    text: [
      `Dear ${first},`,
      '',
      `We could not see any time logged by you on ${when}.`,
      'If you were working, please log it in your timesheet so your effort is recorded. If you were away or unwell, there is nothing to worry about.',
      'We would like to encourage you to start a timer on the task or ticket you are on, or add your time at the end of the day. Please be honest about your hours, because that is what makes the record fair for everyone.',
      '',
      'Thank you for your help,',
      'COEX',
    ].join('\n'),
  };
}

export function summaryEmail(
  day: string,
  agents: AgentDay[],
  minimumMinutes: number,
): { subject: string; text: string } {
  const when = dayLabel(day);
  const sorted = [...agents].sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  const total = sorted.reduce((sum, agent) => sum + agent.minutes, 0);
  const label: Record<DayOutcome, string> = {
    met: 'met the day',
    below: 'below the day',
    none: 'nothing logged',
  };

  const counts = { met: 0, below: 0, none: 0 };
  for (const agent of sorted) counts[classifyDay(agent.minutes, minimumMinutes)] += 1;

  return {
    subject: `Team time summary for ${when}`,
    text: [
      `Time logged on ${when}, with ${hoursText(minimumMinutes)} as the target for a day.`,
      '',
      `${counts.met} met it, ${counts.below} below it, ${counts.none} logged nothing. Together ${hoursText(total)}.`,
      '',
      ...sorted.map(
        (agent) =>
          `${agent.name}: ${hoursText(agent.minutes)} (${label[classifyDay(agent.minutes, minimumMinutes)]})`,
      ),
      '',
      'Each person has been sent their own note: thanks where they logged a full day, and a polite reminder to log their work honestly where they did not.',
    ].join('\n'),
  };
}
