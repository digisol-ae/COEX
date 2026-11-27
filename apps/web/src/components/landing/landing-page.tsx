'use client';

import {
  WebsiteImage as Image,
  WebsiteText,
  WebsiteProvider,
  WebsiteScope,
  useWebsiteContent,
} from './website-content';
import type { WebsiteContent } from './website-schema';
import { WebsiteLink as Link, WebsiteAnchor } from './website-content';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { formatStorage } from '@coex/shared/core/saas';
import { HeroGraphic } from './hero-graphic';
import { ConnectedGraphic } from './connected-graphic';
import { CaptainGraphic } from './captain-graphic';
import { ActionGraphic } from './action-graphic';
import { SpotlightGraphic } from './spotlight-graphic';
import { MeetGraphic } from './meet-graphic';
import './landing.css';

const figma = '/website/figma/';
const handoff = '/website/handoff/';
const contact = 'mailto:info@digisol.ae';

/** Only the supplied UI illustrations need a fixed coordinate system; the page itself reflows. */
function ScaledGraphic({
  width,
  height,
  children,
  className = '',
}: {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width));
    if (parent.current) observer.observe(parent.current);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div
      ref={parent}
      className={`lp-scaled ${className}`}
      style={{ aspectRatio: `${width}/${height}`, maxWidth: width }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale ?? 1})`,
          opacity: scale === null ? 0 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="lp-eyebrow">{children}</span>;
}
function Actions() {
  return (
    <div className="lp-actions">
      <Link className="lp-button" href="/register">
        {<WebsiteText value="Get started" />}
      </Link>
      <WebsiteAnchor className="lp-rainbow-button" href="#explore">
        <span>{<WebsiteText value="Explore Worktello" />}</span>
      </WebsiteAnchor>
    </div>
  );
}
function Brand({ light = false }: { light?: boolean }) {
  if (light) return <Image src={`${figma}5176f.svg`} alt="Worktello" width={248} height={38} />;
  return (
    <span className="lp-brand-crop">
      <Image src={`${figma}17a2a.png`} alt="Worktello" width={1536} height={1024} priority />
    </span>
  );
}

const nav = [
  {
    name: 'Features',
    items: [
      ['Manage work', '#manage-work'],
      ['Track time', '#track-time'],
      ['Customer relationships', '#manage-customers'],
      ['Customer support', '#customer-support'],
      ['Reports and visibility', '#reports'],
    ],
  },
  {
    name: 'Solutions',
    items: [
      ['Business owners', '#audiences'],
      ['C-suite executives', '#audiences'],
      ['Business managers', '#audiences'],
      ['Team leads', '#audiences'],
      ['Product owners', '#audiences'],
    ],
  },
  {
    name: 'Company',
    items: [
      ['Meet Worktello', '#meet-worktello'],
      ['Why Worktello', '#why-worktello'],
      ['Frequently asked questions', '#faq'],
    ],
  },
];
function WebsiteHeader() {
  const [menu, setMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const id = useId();
  return (
    <WebsiteScope name="navigation">
      <header
        className="lp-nav lp-container"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setMenu(null);
            setMobile(false);
          }
        }}
      >
        <WebsiteAnchor href="#top" className="lp-brand" aria-label="Worktello home">
          <Brand />
        </WebsiteAnchor>
        <nav
          id={id}
          aria-label="Website"
          className={mobile ? 'lp-nav-links is-open' : 'lp-nav-links'}
        >
          {nav.map((group) => (
            <div className="lp-nav-group" key={group.name}>
              <button
                type="button"
                aria-expanded={menu === group.name}
                aria-controls={`${id}-${group.name}`}
                onClick={() => setMenu(menu === group.name ? null : group.name)}
              >
                {<WebsiteText value={group.name} />}
                <Image src={`${figma}cd09d.svg`} alt="" width={20} height={20} />
              </button>
              {menu === group.name && (
                <div className="lp-nav-dropdown" id={`${id}-${group.name}`}>
                  {group.items.map(([label, href]) => (
                    <WebsiteAnchor
                      key={label}
                      href={href}
                      onClick={() => {
                        setMenu(null);
                        setMobile(false);
                      }}
                    >
                      {<WebsiteText value={label} />}
                    </WebsiteAnchor>
                  ))}
                </div>
              )}
            </div>
          ))}
          <WebsiteAnchor href="#contact" onClick={() => setMobile(false)}>
            {<WebsiteText value="Contact" />}
          </WebsiteAnchor>
          <Link className="lp-mobile-login" href="/login?view=staff">
            {<WebsiteText value="Log in" />}
          </Link>
          <WebsiteAnchor
            className="lp-mobile-login"
            href={`${contact}?subject=Worktello%20plans%20and%20pricing`}
          >
            {<WebsiteText value="Pricing" />}
          </WebsiteAnchor>
        </nav>
        <div className="lp-nav-actions">
          <WebsiteAnchor
            className="lp-pricing"
            href={`${contact}?subject=Worktello%20plans%20and%20pricing`}
          >
            {<WebsiteText value="Pricing" />}
          </WebsiteAnchor>
          <Link className="lp-login" href="/login?view=staff">
            {<WebsiteText value="Log in" />}
          </Link>
          <Link className="lp-button" href="/register">
            {<WebsiteText value="Get started" />}
          </Link>
        </div>
        <button
          type="button"
          className="lp-menu-toggle"
          aria-label={mobile ? 'Close website menu' : 'Open website menu'}
          aria-controls={id}
          aria-expanded={mobile}
          onClick={() => setMobile(!mobile)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>
    </WebsiteScope>
  );
}

const captainItems = [
  {
    title: 'Team Activity',
    text: 'Get a clear overview of your team’s daily activities, assigned tasks, opportunities, time tracking, and support. See who’s working on what, how much time they’re spending, and how work is progressing.',
  },
  {
    title: 'Requests and Approvals',
    text: 'Review task updates, work reviews, and contract signing requests. Keep decisions organized and give your team a clear record of each approval.',
  },
  {
    title: 'CRM',
    text: 'Manage client information, track opportunities, and keep customer interactions organized. Give your team the visibility they need to move business forward.',
  },
];
function Captains() {
  const [active, setActive] = useState(0);
  const id = useId();
  return (
    <WebsiteScope name="captains">
      <section
        className="lp-container lp-section lp-captains"
        id="captains"
        aria-labelledby="captains-title"
      >
        <Image
          className="lp-section-background"
          src={`${figma}b1d0b.png`}
          alt=""
          fill
          sizes="(max-width: 1920px) 90vw, 1720px"
        />
        <div className="lp-captain-copy">
          <Eyebrow>{<WebsiteText value="For team captains" />}</Eyebrow>
          <h2 id="captains-title">{<WebsiteText value="How captains stay in control" />}</h2>
          <p>
            {
              <WebsiteText value="Keep your team aligned, work organized, and business moving forward. Worktello gives captains everything they need to manage team activities, handle requests, and maintain strong client relationships — all in one place." />
            }
          </p>
          <div className="lp-accordion lp-captain-accordion">
            {captainItems.map((item, index) => (
              <div className="lp-accordion-item" key={item.title}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={active === index}
                    aria-controls={`${id}-${index}`}
                    onClick={() => setActive(index)}
                  >
                    {<WebsiteText value={item.title} />}
                    <Image
                      src={`${figma}${active === index ? '07e5e.svg' : '1abbc.svg'}`}
                      alt=""
                      width={30}
                      height={30}
                    />
                  </button>
                </h3>
                {active === index && (
                  <p id={`${id}-${index}`}>{<WebsiteText value={item.text} />}</p>
                )}
              </div>
            ))}
          </div>
          <WebsiteAnchor className="lp-button" href="#meet-worktello">
            {<WebsiteText value="Explore all captains’ capabilities" />}
          </WebsiteAnchor>
        </div>
        <div
          className="lp-captain-preview"
          aria-label={`${captainItems[active].title} product preview`}
        >
          <ScaledGraphic width={976} height={680}>
            <CaptainGraphic active={active} />
          </ScaledGraphic>
        </div>
      </section>
    </WebsiteScope>
  );
}

const tools = [
  {
    id: 'manage-work',
    title: 'Keep every task moving.',
    text: 'Create, assign, and organize tasks across spaces. Manage deadlines, update statuses, and follow progress as work gets done.',
    image: 'keep-every-task-moving.png',
  },
  {
    id: 'track-time',
    title: 'Make every hour count.',
    text: 'Track time directly against tasks, manage timesheets, and understand how working hours are distributed.',
    image: 'make-every-hour-count.png',
  },
  {
    id: 'oversight',
    title: 'Keep oversight within reach.',
    text: 'Review security audit activity and access platform configuration and administrative settings from your workspace.',
    image: 'keep-oversight-within-reach.png',
  },
  {
    id: 'customer-support',
    title: 'Stay on top of every request.',
    text: 'Organize support tickets, track ownership, monitor workloads, and maintain visibility into customer requests.',
    image: 'stay-on-top-of-every-request.png',
  },
  {
    id: 'reports',
    title: 'Turn activity into clarity.',
    text: 'Review time reports, team activity, open workloads, and progress indicators to make more informed decisions.',
    image: 'turn-activity-into-clarity.png',
  },
  {
    id: 'manage-customers',
    title: 'Keep every opportunity in sight.',
    text: 'Manage customer records, leads, products, contracts, and opportunities while monitoring progress through your sales pipeline.',
    image: 'keep-every-opportunity-in-sight.png',
  },
];
const actionItems = [
  {
    title: 'Dashboard',
    text: 'Your work, opportunities, time, and support activity in one overview.',
    image: 'dashboard.png',
  },
  {
    title: 'Tasks & Spaces',
    text: 'Organize work in spaces, folders, tasks, and subtasks. Follow progress with board, list, and Gantt views.',
    image: 'tasks-spaces.png',
  },
  {
    title: 'CRM',
    text: 'Keep customers, contacts, leads, opportunities, and contracts connected.',
    image: 'crm.png',
  },
  {
    title: 'Time Reports',
    text: 'Review logged time, team activity, and working hours with clear reports.',
    image: 'time-reports.png',
  },
  {
    title: 'Support',
    text: 'Track customer requests, replies, ownership, and service targets in one place.',
    image: 'support.png',
  },
];
function ProductAction() {
  const [active, setActive] = useState(0);
  const id = useId();
  return (
    <WebsiteScope name="tour">
      <section
        className="lp-container lp-section lp-product-action"
        id="explore"
        aria-labelledby="explore-title"
      >
        <div
          className="lp-action-picture"
          aria-label={`${actionItems[active].title} product preview`}
        >
          <Image src={`${figma}f1fb2.png`} alt="" fill sizes="(max-width: 800px) 90vw, 46vw" />
          {/* Figma's frosted layer (7dd3e.svg) uses an SVG backdrop filter, which browsers ignore inside <img>. */}
          <span className="lp-action-frost" aria-hidden="true" />
          {active === 0 ? (
            <div className="lp-action-montage">
              <ScaledGraphic width={719} height={585}>
                <ActionGraphic />
              </ScaledGraphic>
            </div>
          ) : (
            <div className="lp-action-selected">
              <Image
                src={`${handoff}see-worktello-in-action/${actionItems[active].image}`}
                alt={`${actionItems[active].title} in Worktello`}
                fill
                sizes="(max-width: 800px) 85vw, 40vw"
              />
            </div>
          )}
        </div>
        <div className="lp-action-copy">
          <Eyebrow>{<WebsiteText value="See Worktello in action" />}</Eyebrow>
          <h2 id="explore-title">
            {<WebsiteText value="A clearer view of how work gets done." />}
          </h2>
          <p>
            {
              <WebsiteText value="Explore the workspace that brings your projects, people, and business workflows together." />
            }
          </p>
          <p>
            {
              <WebsiteText value="Switch between your tasks, timesheets, customer records, and support tickets with dedicated views for different types of work." />
            }
          </p>
          <div className="lp-accordion">
            {actionItems.map((item, index) => (
              <div className="lp-accordion-item" key={item.title}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={active === index}
                    aria-controls={`${id}-${index}`}
                    onClick={() => setActive(index)}
                  >
                    {<WebsiteText value={item.title} />}
                    <Image src={`${figma}1abbc.svg`} alt="" width={30} height={30} />
                  </button>
                </h3>
                {active === index && (
                  <p id={`${id}-${index}`}>{<WebsiteText value={item.text} />}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </WebsiteScope>
  );
}

const audiences = [
  [
    'Business owners',
    'Get a complete overview of business operations, team performance, and overall progress.',
    'business-owners.png',
  ],
  [
    'C-suite executives',
    'Make informed decisions with clear visibility into business performance and organizational activities.',
    'c-suite-executives.png',
  ],
  [
    'Business managers',
    'Manage daily operations, monitor team productivity, and keep business activities on track.',
    'business-managers.png',
  ],
  [
    'Team leads',
    'Oversee team activities, assign tasks, track progress, and keep everyone aligned.',
    'team-leads.png',
  ],
  [
    'Product owners',
    'Manage product workflows, prioritize tasks, and ensure teams stay focused on delivery.',
    'product-owners.png',
  ],
];
const meet = [
  [
    'Manage Work',
    'Organize projects, assign tasks, and keep your team aligned.',
    'e03a5.svg',
    'Design handoff · Review content',
  ],
  [
    'Track Time',
    'Log working hours and understand where your team’s time goes.',
    'a9712.svg',
    '31h 24m · Weekly logged time',
  ],
  [
    'Manage Customers',
    'Keep customer information, leads, contracts, and opportunities connected.',
    '8609e.svg',
    'Customers · Leads · Opportunities',
  ],
  [
    'Customer Support',
    'Organize tickets, monitor workloads, and manage customer requests.',
    '77367.svg',
    'Account access · Open',
  ],
];
const why = [
  ['One Connected Workspace', 'Bring projects, time tracking, CRM, and customer support together.'],
  [
    'Clarity at Every Level',
    'Stay focused on personal priorities while maintaining visibility across team workloads.',
  ],
  ['Better Visibility', 'Monitor tasks, working hours, opportunities, and support activity.'],
  [
    'Organized Workflows',
    'Structure responsibilities across teams, projects, and business activities.',
  ],
];
export const defaultFaq = [
  [
    'Who is Worktello designed for?',
    'Worktello is designed for business owners, team leads, managers, executives, and product owners who want to organize work and keep their teams connected.',
  ],
  [
    'Can I manage projects and track time in Worktello?',
    'Yes. Organize work in spaces, folders, tasks, and subtasks, then use timers and timesheets to track working hours. Your available capabilities follow your workspace plan.',
  ],
  [
    'Does Worktello include a CRM?',
    'Yes. Worktello connects customer records and contacts with leads, opportunities, products, and contracts through its Sales CRM module.',
  ],
  [
    'Can Worktello help manage customer support?',
    'Yes. Support teams can manage tickets, replies, queues, service targets, and customer resources. Customers use the portal connected to their company workspace.',
  ],
  [
    'What is My Desk in Worktello?',
    'My Desk is your daily work list. Choose assigned work, track progress, and review your daily performance history.',
  ],
  [
    'Can managers monitor team activity and reports?',
    'Yes. Authorized managers can review team activity, time reports, workloads, and progress while workspace permissions protect access to information.',
  ],
];
function Questions() {
  const content = useWebsiteContent();
  const faq = content?.faq ?? defaultFaq;
  const [open, setOpen] = useState<number | null>(null);
  const id = useId();
  return (
    <WebsiteScope name="faq">
      <section className="lp-container lp-section lp-faq" id="faq" aria-labelledby="faq-title">
        <Eyebrow>{<WebsiteText value="FAQ" />}</Eyebrow>
        <h2 id="faq-title">{<WebsiteText value="Have questions? We’ve got answers." />}</h2>
        <p>
          {
            <WebsiteText value="Everything you need to know about Worktello and how it helps your team stay organized." />
          }
        </p>
        <div className="lp-questions">
          {faq.map(([question, answer], index) => (
            <div className="lp-question" key={question}>
              <h3>
                <button
                  type="button"
                  aria-expanded={open === index}
                  aria-controls={`${id}-${index}`}
                  onClick={() => setOpen(open === index ? null : index)}
                >
                  {question}
                  <Image
                    className={open === index ? 'is-open' : ''}
                    src={`${figma}92ff1.svg`}
                    alt=""
                    width={28}
                    height={28}
                  />
                </button>
              </h3>
              {open === index && <p id={`${id}-${index}`}>{answer}</p>}
              {index !== faq.length - 1 && (
                <Image
                  className="lp-faq-line"
                  src={`${figma}7f371.svg`}
                  alt=""
                  width={1720}
                  height={1}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </WebsiteScope>
  );
}

export function LandingPage({
  trialDays,
  storageLimitBytes,
  content,
  onSelectText,
}: {
  content?: WebsiteContent;
  onSelectText?: (key: string) => void;
  trialDays: number;
  storageLimitBytes: number;
}) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  return (
    <WebsiteProvider value={content} onSelect={onSelectText}>
      <main className="landing-shell" id="top">
        <WebsiteScope name="hero">
          <div className="lp-hero">
            <Image
              className="lp-hero-grid-top"
              src={`${figma}fd5d2.svg`}
              alt=""
              width={1920}
              height={381}
              priority
            />
            <Image
              className="lp-hero-grid-bottom"
              src={`${figma}f004a.svg`}
              alt=""
              width={1920}
              height={256}
            />
            <WebsiteHeader />
            <div className="lp-hero-copy">
              <h1>
                <span className="lp-headline-first">
                  {<WebsiteText value="Bring your work together." />}
                </span>
                <span className="lp-headline-second">
                  {<WebsiteText value="Move everything" />}{' '}
                  <span className="lp-word-window">
                    <span className="lp-word-track" aria-hidden="true">
                      <span>{<WebsiteText value="forward." />}</span>
                      <span>{<WebsiteText value="fast." />}</span>
                      <span>{<WebsiteText value="in flow." />}</span>
                      <span>{<WebsiteText value="on time." />}</span>
                      <span>{<WebsiteText value="forward." />}</span>
                    </span>
                    <span className="sr-only">{<WebsiteText value="forward." />}</span>
                  </span>
                </span>
              </h1>
              <p>
                {
                  <WebsiteText value="Manage projects, track time, organize customers, and handle support — all in one connected workspace built to keep your team on track." />
                }
              </p>
              <Actions />
              <p className="lp-tagline">
                {<WebsiteText value="Work management · Time tracking · CRM · Customer support" />}
              </p>
            </div>
            <figure
              className="lp-hero-preview"
              data-preview-theme={theme}
              aria-label="Interactive Worktello dashboard preview"
            >
              <ScaledGraphic width={1300} height={944}>
                <HeroGraphic
                  theme={theme}
                  onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                />
                <div className="lp-floating-one">
                  <div>
                    <Image src={`${figma}3ad0f.png`} alt="" width={1903} height={1007} />
                  </div>
                </div>
                <div className="lp-floating-two">
                  <div>
                    <Image src={`${figma}3ad0f.png`} alt="" width={1903} height={1007} />
                  </div>
                </div>
              </ScaledGraphic>
              <figcaption className="sr-only">
                {
                  <WebsiteText value="An illustrative workspace showing tasks, opportunities, logged time, and support activity. The theme switch changes this preview only." />
                }
              </figcaption>
            </figure>
          </div>
        </WebsiteScope>
        <Captains />
        <WebsiteScope name="connected">
          <section
            className="lp-container lp-section lp-connected lp-pale"
            id="connected"
            aria-labelledby="connected-title"
          >
            <div className="lp-connected-heading">
              <Eyebrow>{<WebsiteText value="One connected workspace" />}</Eyebrow>
              <h2 id="connected-title">
                <Image
                  src={`${figma}eca7e.svg`}
                  alt="Everything your business needs, all connected"
                  width={1279}
                  height={58}
                />
                <span aria-hidden="true">{<WebsiteText value="your business needs" />}</span>
              </h2>
              <p>
                {
                  <WebsiteText value="Worktello brings your entire business workflow together in one powerful platform. From task planning and team management to client support, timesheets, CRM, and administration, everything works seamlessly together to keep your business organized, connected, and moving forward." />
                }
              </p>
            </div>
            <div className="lp-desktop-map">
              <ScaledGraphic width={1397} height={928}>
                <ConnectedGraphic />
              </ScaledGraphic>
            </div>
            <div className="lp-mobile-map" aria-label="Connected workspace capabilities">
              <Brand />
              <div>
                {[
                  'Administration & Security',
                  'Support & Setup',
                  'Timesheets & CRM',
                  'Tasks and planning',
                ].map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
              <p>
                {<WebsiteText value="One " />}
                <strong>{<WebsiteText value="platform." />}</strong>
                {<WebsiteText value=" Multiple " />}
                <strong>{<WebsiteText value="capabilities." />}</strong>
                {<WebsiteText value=" Complete" />}{' '}
                <strong>{<WebsiteText value="visibility." />}</strong>
              </p>
            </div>
          </section>
        </WebsiteScope>
        <WebsiteScope name="features">
          <section
            className="lp-container lp-section"
            id="capabilities"
            aria-labelledby="capabilities-title"
          >
            <div className="lp-heading-row">
              <div>
                <Eyebrow>{<WebsiteText value="Powerful tools. One platform." />}</Eyebrow>
                <h2 id="capabilities-title">
                  {<WebsiteText value="More than project management." />}
                </h2>
                <p>
                  {
                    <WebsiteText value="Bring the tools your team depends on into one workspace. From planning and collaboration to customer relationships and reporting, Worktello keeps your work connected." />
                  }
                </p>
              </div>
              <WebsiteAnchor className="lp-button" href="#meet-worktello">
                {<WebsiteText value="Explore all capabilities" />}
              </WebsiteAnchor>
            </div>
            <div className="lp-tools-grid">
              {tools.map((tool) => (
                <article className="lp-tool-card" id={tool.id} key={tool.id}>
                  <div className="lp-tool-image">
                    <Image
                      src={`${handoff}powerful-tools-one-platform/${tool.image}`}
                      alt=""
                      fill
                      sizes="(max-width: 600px) 90vw, (max-width: 1100px) 44vw, 22vw"
                    />
                  </div>
                  <h3>{tool.title}</h3>
                  <p>{tool.text}</p>
                </article>
              ))}
              <article className="lp-tool-spotlight">
                <Image
                  className="lp-section-background"
                  src={`${handoff}powerful-tools-one-platform/lead-your-team-stay-in-control-2.png`}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 90vw, 45vw"
                />
                <h3>{<WebsiteText value="Lead your team. Stay in control." />}</h3>
                <p>
                  {
                    <WebsiteText value="Designed for captains, team leads, managers, CEOs, and C-suite executives who need complete visibility into team performance, business operations, and progress — all from one place." />
                  }
                </p>
                <div className="lp-spotlight-graphic">
                  <ScaledGraphic width={622} height={235}>
                    <SpotlightGraphic />
                  </ScaledGraphic>
                </div>
              </article>
            </div>
          </section>
        </WebsiteScope>
        <WebsiteScope name="integrations">
          <section
            className="lp-container lp-section lp-pale lp-integrations"
            id="integrations"
            aria-labelledby="integrations-title"
          >
            <div className="lp-section-heading">
              <Eyebrow>{<WebsiteText value="Connected workspace" />}</Eyebrow>
              <h2 id="integrations-title">
                {<WebsiteText value="Stay connected. Stay informed" />}
              </h2>
              <p>
                {
                  <WebsiteText value="Worktello keeps your workflow connected with the tools you already use while making sure you never miss an important business update. Integrate with Microsoft Teams and Outlook, and stay informed through timely notifications." />
                }
              </p>
            </div>
            <div className="lp-integration-grid">
              {[
                {
                  name: 'MS Teams integration',
                  title: 'Keep your team connected',
                  text: 'Connect Worktello with Microsoft Teams to bring your team communication closer to your daily workflows and stay connected with important updates.',
                  image: 'ms-teams-integration.png',
                  icon: 'group-2085662846.png',
                },
                {
                  name: 'Outlook integration',
                  title: 'Keep your work in sync',
                  text: 'Connect Outlook with Worktello to streamline your workflow and keep important business communication within reach.',
                  image: 'outlook-integration.png',
                  icon: 'group-2085662847.png',
                },
                {
                  name: 'Smart notifications',
                  title: 'Never miss what matters',
                  text: 'Stay informed about assigned work, customer replies, and contract renewals through your workspace’s notification preferences.',
                  image: 'smart-notifications.png',
                  icon: 'group-2085662848.png',
                },
              ].map((item) => (
                <article className="lp-integration-card" key={item.name}>
                  <Image
                    className="lp-section-background"
                    src={`${handoff}connected-workspace/${item.image}`}
                    alt=""
                    fill
                    sizes="(max-width: 800px) 90vw, 30vw"
                  />
                  <div>
                    <p className="lp-integration-label">{<WebsiteText value={item.name} />}</p>
                    <h3>{<WebsiteText value={item.title} />}</h3>
                    <Image
                      className="lp-integration-icon"
                      src={`${handoff}connected-workspace/${item.icon}`}
                      alt=""
                      width={76}
                      height={76}
                    />
                    <p className="lp-integration-description">
                      {<WebsiteText value={item.text} />}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </WebsiteScope>
        <ProductAction />
        <WebsiteScope name="audiences">
          <section
            className="lp-section lp-dark lp-audiences"
            id="audiences"
            aria-labelledby="audiences-title"
          >
            <div className="lp-container">
              <div className="lp-section-heading">
                <Eyebrow>{<WebsiteText value="Who is Worktello for?" />}</Eyebrow>
                <h2 id="audiences-title">
                  {<WebsiteText value="Built for people who lead and manage" />}
                </h2>
                <p>
                  {
                    <WebsiteText value="From business owners to team leaders, Worktello empowers decision-makers to manage teams, track performance, oversee operations, and keep everything moving in the right direction." />
                  }
                </p>
              </div>
              <div className="lp-audience-grid">
                {audiences.map(([title, text, image]) => (
                  <article key={title}>
                    <Image
                      src={`${handoff}who-is-worktello-for/${image}`}
                      alt=""
                      fill
                      sizes="(max-width: 600px) 90vw, (max-width: 1100px) 44vw, 18vw"
                    />
                    <div>
                      <h3>{<WebsiteText value={title} />}</h3>
                      <p>{<WebsiteText value={text} />}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </WebsiteScope>
        <WebsiteScope name="meet">
          <section
            className="lp-container lp-section lp-pale lp-meet"
            id="meet-worktello"
            aria-labelledby="meet-title"
          >
            <div className="lp-heading-row">
              <div>
                <Eyebrow>{<WebsiteText value="Meet Worktello" />}</Eyebrow>
                <h2 id="meet-title">
                  {<WebsiteText value="Everything your team needs, working together." />}
                </h2>
                <p>
                  {
                    <WebsiteText value="From daily tasks to customer relationships, Worktello brings your essential business workflows into one organized platform." />
                  }
                </p>
              </div>
              <Link className="lp-button" href="/register">
                {<WebsiteText value="Meet Worktello now" />}
              </Link>
            </div>
            <div className="lp-desktop-meet">
              <ScaledGraphic width={1618} height={328}>
                <MeetGraphic />
              </ScaledGraphic>
            </div>
            <div className="lp-mobile-meet">
              {meet.map(([title, text, icon, example]) => (
                <article key={title}>
                  <span>
                    <Image src={`${figma}${icon}`} alt="" width={26} height={26} />
                  </span>
                  <h3>{<WebsiteText value={title} />}</h3>
                  <p>{<WebsiteText value={text} />}</p>
                  <div className="lp-mini-demo">{<WebsiteText value={example} />}</div>
                </article>
              ))}
            </div>
          </section>
        </WebsiteScope>
        <WebsiteScope name="why">
          <section
            className="lp-section lp-dark lp-why"
            id="why-worktello"
            aria-labelledby="why-title"
          >
            <div className="lp-container">
              <div className="lp-section-heading">
                <Eyebrow>{<WebsiteText value="Why Worktello" />}</Eyebrow>
                <h2 id="why-title">{<WebsiteText value="Less complexity. More clarity." />}</h2>
                <p>
                  {
                    <WebsiteText value="Worktello brings essential business workflows into one connected environment, helping teams stay focused while giving managers better visibility into the work that matters." />
                  }
                </p>
              </div>
              <div className="lp-why-grid">
                {why.map(([title, text]) => (
                  <article key={title}>
                    <h3>{<WebsiteText value={title} />}</h3>
                    <p>{<WebsiteText value={text} />}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </WebsiteScope>
        <Questions />
        <WebsiteScope name="footer">
          <section className="lp-container lp-section lp-bottom-cta" aria-labelledby="cta-title">
            <Image
              className="lp-section-background"
              src={`${handoff}footer/cta-section.png`}
              alt=""
              fill
              sizes="90vw"
            />
            <Eyebrow>{<WebsiteText value="Your workspace starts here" />}</Eyebrow>
            <h2 id="cta-title">
              {<WebsiteText value="Bring everything together. Work better." />}
            </h2>
            <p>
              {
                <WebsiteText value="Give your team one place to manage work, track progress, and stay connected across everyday business operations." />
              }
            </p>
            <Actions />
            <p className="lp-trial-note">
              Apply for a {trialDays}-day trial with {formatStorage(storageLimitBytes)} of storage.
              Approval required.
            </p>
          </section>
        </WebsiteScope>
        <WebsiteScope name="footer">
          <footer className="lp-footer" id="contact">
            <Image
              className="lp-footer-art"
              src={`${figma}5504f.png`}
              alt=""
              width={632}
              height={470}
            />
            <div className="lp-container">
              <WebsiteAnchor className="lp-footer-brand" href="#top" aria-label="Worktello home">
                <Brand light />
              </WebsiteAnchor>
              <p className="lp-footer-description">
                {
                  <WebsiteText value="Manage projects, track time, connect customer relationships, and handle support — all in one workspace built to keep your team moving." />
                }
              </p>
              <p className="lp-connect-label">
                {<WebsiteText value="Connect with us " />}
                <Image src={`${figma}dc7ad.png`} alt="" width={32} height={32} />
              </p>
              <div className="lp-socials">
                <WebsiteAnchor
                  href="https://www.linkedin.com/company/digisol-ae/"
                  aria-label="DigiSol on LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src={`${figma}461e0.svg`} alt="" width={48} height={48} />
                  <Image
                    className="lp-social-hover"
                    src={`${figma}461e0-hover.svg`}
                    alt=""
                    width={48}
                    height={48}
                  />
                </WebsiteAnchor>
                <WebsiteAnchor
                  href="https://www.instagram.com/digisol.ae/"
                  aria-label="DigiSol on Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src={`${figma}b3eee.svg`} alt="" width={48} height={48} />
                  <Image
                    className="lp-social-hover"
                    src={`${figma}b3eee-hover.svg`}
                    alt=""
                    width={48}
                    height={48}
                  />
                </WebsiteAnchor>
                <WebsiteAnchor
                  href="https://www.facebook.com/digisol.ae/"
                  aria-label="DigiSol on Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src={`${figma}f4d56.svg`} alt="" width={48} height={48} />
                  <Image
                    className="lp-social-hover"
                    src={`${figma}f4d56-hover.svg`}
                    alt=""
                    width={48}
                    height={48}
                  />
                </WebsiteAnchor>
                <WebsiteAnchor className="lp-email" href={contact}>
                  {<WebsiteText value="info@digisol.ae" />}
                </WebsiteAnchor>
              </div>
              <div className="lp-footer-bottom">
                <p>© {new Date().getUTCFullYear()} Worktello. All rights reserved.</p>
                <nav aria-label="Legal">
                  <Link href="/login">{<WebsiteText value="Customer login" />}</Link>
                  <Link href="/privacy">{<WebsiteText value="Cookies" />}</Link>
                  <Link href="/privacy">{<WebsiteText value="Privacy" />}</Link>
                  <Link href="/terms">{<WebsiteText value="Terms & conditions" />}</Link>
                </nav>
              </div>
            </div>
          </footer>
        </WebsiteScope>
      </main>
    </WebsiteProvider>
  );
}
