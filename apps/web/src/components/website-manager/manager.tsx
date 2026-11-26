'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { defaultFaq } from '@/components/landing/landing-page';
import defaults from '@/components/landing/website-defaults.json';
import { websiteSchema, type WebsiteContent } from '@/components/landing/website-schema';
import type { websiteEditor } from '@/modules/core/services/website-content.service';
import { updateWebsite, uploadImage } from '@/app/website-manager/actions';
import sections from './sections.json';
import './manager.css';
type Section = (typeof sections)[number];
type ImageTarget = {
  scope?: string;
  source?: string;
  label: string;
  social?: boolean;
};
const websiteImages = [
  ...new Set(sections.flatMap((section) => section.images?.map((image) => image.source) ?? [])),
];
const imageLabels = new Map(
  sections.flatMap(
    (section) => section.images?.map((image) => [image.source, image.label] as const) ?? [],
  ),
);
const empty: WebsiteContent = {
  texts: {},
  links: {},
  images: {},
  faq: defaultFaq as [string, string][],
  seo: {
    title: 'Worktello — Bring your work together',
    description:
      'Manage projects, track time, organize customers, and handle support in one connected workspace.',
    image: '',
  },
};
function Icon({
  name,
}: {
  name: 'back' | 'globe' | 'desktop' | 'mobile' | 'arrow' | 'image' | 'check' | 'close';
}) {
  const paths = {
    back: 'M19 12H5m6-6-6 6 6 6',
    globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-4 5-4 13 0 18 4-5 4-13 0-18Z',
    desktop: 'M3 4h18v13H3zM8 21h8m-4-4v4',
    mobile: 'M7 2h10v20H7zM11 18h2',
    arrow: 'm9 5 7 7-7 7',
    image: 'M3 3h18v18H3zM3 16l6-6 5 5 3-3 4 4M16 7h.01',
    check: 'm5 12 4 4L19 6',
    close: 'm6 6 12 12M6 18 18 6',
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function WebsiteManager({
  initial,
}: {
  initial: Awaited<ReturnType<typeof websiteEditor>>;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState<number | null>(null);
  const [state, setState] = useState(initial),
    [content, setContent] = useState<WebsiteContent>(initial.draft ?? empty),
    [active, setActive] = useState('hero'),
    [dirty, setDirty] = useState(false),
    [pending, start] = useTransition(),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(false),
    [device, setDevice] = useState<'desktop' | 'mobile'>('desktop'),
    [expanded, setExpanded] = useState(false),
    [target, setTarget] = useState<ImageTarget | null>(null),
    [library, setLibrary] = useState(initial.media.map((m) => m.url)),
    [gallery, setGallery] = useState<'uploaded' | 'website'>('uploaded'),
    [confirmPublish, setConfirmPublish] = useState(false),
    [selectedField, setSelectedField] = useState(''),
    [scale, setScale] = useState(1);
  const frame = useRef<HTMLIFrameElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    upload = useRef<HTMLInputElement>(null);
  const section = sections.find((s) => s.id === active) ?? sections[0];
  const published = !dirty && state.history[0]?.operation === 'publish';
  const previewWidth = device === 'mobile' ? 390 : 1440;
  function edit(next: WebsiteContent) {
    setContent(next);
    setDirty(true);
    setNotice('');
    setError(false);
  }
  function changeText(key: string, value: string) {
    key = section.id + '::' + key;
    edit({ ...content, texts: { ...content.texts, [key]: value } });
  }
  function text(key: string) {
    return (
      content.texts[section.id + '::' + key] ??
      content.texts[key] ??
      defaults[key as keyof typeof defaults] ??
      key
    );
  }
  function sendPreview() {
    frame.current?.contentWindow?.postMessage(
      { type: 'worktello-website-preview', content, section: section.anchor },
      window.location.origin,
    );
  }
  useEffect(() => {
    const timer = setTimeout(
      () =>
        frame.current?.contentWindow?.postMessage(
          { type: 'worktello-website-preview', content, section: section.anchor },
          window.location.origin,
        ),
      140,
    );
    return () => clearTimeout(timer);
  }, [content, section.anchor]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow)
        return;
      if (event.data?.type === 'worktello-website-preview-ready') sendPreview();
      if (event.data?.type === 'worktello-website-select' && typeof event.data.key === 'string') {
        const key = event.data.key;
        const found = sections.find((s) =>
          s.groups.some((g) => g.fields.some((f) => s.id + '::' + f.key === key)),
        );
        if (!found) return;
        setActive(found.id);
        setSelectedField(key);
        setTimeout(
          () =>
            document
              .querySelector<HTMLInputElement>('[data-copy-key="' + CSS.escape(key) + '"]')
              ?.focus(),
          80,
        );
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, (entry.contentRect.width - 40) / previewWidth)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [previewWidth, expanded]);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);
  useEffect(() => {
    if (!target && !confirmPublish && !leaving) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.wm-modal');
    const controls = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);
    controls()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) {
        setTarget(null);
        setConfirmPublish(false);
        setLeaving(false);
      }
      if (event.key !== 'Tab') return;
      const items = controls(),
        first = items[0],
        last = items.at(-1);
      if (!first) return;
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      window.removeEventListener('keydown', keyboard);
      if (previous?.isConnected) previous.focus();
    };
  }, [target, confirmPublish, leaving, pending]);
  function run(operation: 'save' | 'publish' | 'restore', revision?: number) {
    if (operation === 'save') {
      const checked = websiteSchema.safeParse(content);
      if (!checked.success) {
        setLeaving(false);
        const issue = checked.error.issues[0];
        setError(true);
        if (issue.path[0] === 'faq') {
          setActive('faq');
          setNotice(
            'Question ' +
              (Number(issue.path[1]) + 1) +
              ': add both a question and an answer before saving.',
          );
        } else if (issue.path[0] === 'seo') {
          setActive('seo');
          setNotice('Add a page title and check your search settings before saving.');
        } else if (issue.path[0] === 'links') {
          setNotice(
            'Check the button destination. Use a website path, email address or HTTPS link.',
          );
        } else setNotice('Please check the highlighted section before saving.');
        return;
      }
    }
    start(async () => {
      try {
        const result = await updateWebsite(
          operation,
          state.revision,
          operation === 'save' ? content : undefined,
          revision,
        );
        if (!result.ok) throw new Error(result.error);
        setState(result.state);
        if (result.state.draft) setContent(result.state.draft);
        setDirty(false);
        setError(false);
        setNotice(
          operation === 'publish'
            ? 'Your changes are now live on worktello.com.'
            : operation === 'restore'
              ? 'Version restored as a draft. Preview it before publishing.'
              : 'Draft saved. Your live website has not changed.',
        );
        setConfirmPublish(false);
        if (operation === 'save' && leaving) {
          setLeaving(false);
          router.push('/dashboard');
        }
      } catch (error) {
        setError(true);
        setNotice(error instanceof Error ? error.message : 'Unable to save. Please try again.');
      }
    });
  }
  function confirmLeave(event: { preventDefault: () => void }) {
    if (pending || dirty) {
      event.preventDefault();
      if (!pending) setLeaving(true);
    }
  }
  function chooseImage(url: string) {
    if (!target) return;
    edit(
      target.social
        ? { ...content, seo: { ...content.seo, image: url } }
        : {
            ...content,
            images: {
              ...content.images,
              [(target.scope ?? section.id) + '::' + target.source!]: url,
            },
          },
    );
    setTarget(null);
  }
  function imageCard(image: ImageTarget) {
    const url = image.social
      ? content.seo.image
      : (content.images[section.id + '::' + image.source!] ??
        content.images[image.source!] ??
        image.source!);
    return (
      <div className="wm-image-card" key={image.label}>
        <div className="wm-image-thumb">
          {url ? (
            <Image src={url} alt={image.label} fill sizes="300px" unoptimized />
          ) : (
            <Icon name="image" />
          )}
        </div>
        <div className="wm-image-caption">
          <span>{image.label}</span>
          <button
            className="wm-btn wm-btn-small"
            disabled={pending}
            onClick={() => {
              setGallery(library.length ? 'uploaded' : 'website');
              setTarget({ ...image, scope: section.id });
            }}
          >
            Change image
          </button>
        </div>
      </div>
    );
  }
  function renderFields(s: Section) {
    return s.groups.map((group) => (
      <section className="wm-field-group" key={group.label}>
        <h3>{group.label}</h3>
        {group.fields.map((field) => (
          <label
            className="wm-field"
            data-selected={selectedField === s.id + '::' + field.key}
            key={field.key}
          >
            <span>{field.label}</span>
            {field.multiline ? (
              <textarea
                rows={4}
                maxLength={5000}
                disabled={pending}
                data-copy-key={s.id + '::' + field.key}
                value={text(field.key)}
                onChange={(event) => changeText(field.key, event.target.value)}
              />
            ) : (
              <input
                disabled={pending}
                maxLength={5000}
                data-copy-key={s.id + '::' + field.key}
                value={text(field.key)}
                onChange={(event) => changeText(field.key, event.target.value)}
              />
            )}
          </label>
        ))}
      </section>
    ));
  }
  return (
    <div className="wm">
      <header className="wm-header">
        <div className="wm-identity">
          <Link
            href="/dashboard"
            onClick={confirmLeave}
            className="wm-back"
            aria-label="Back to Worktello"
          >
            <Icon name="back" />
          </Link>
          <span className="wm-logo">
            w<span>.</span>
          </span>
          <div>
            <h1>Website Manager</h1>
            <span className="wm-site">
              <Icon name="globe" />
              worktello.com
            </span>
          </div>
        </div>
        <div className="wm-header-actions">
          <span className="wm-save-state">
            <i data-dirty={dirty} />
            {pending
              ? 'Saving…'
              : dirty
                ? 'Unsaved changes'
                : published
                  ? 'Published'
                  : state.draft
                    ? 'Draft saved'
                    : 'No unpublished changes'}
          </span>
          <button
            className="wm-btn"
            disabled={pending || (!dirty && !!state.draft)}
            onClick={() => run('save')}
          >
            Save draft
          </button>
          <button
            className="wm-btn wm-primary"
            disabled={pending || dirty || !state.draft || published}
            onClick={() => setConfirmPublish(true)}
          >
            {published ? 'Published' : 'Publish'} <Icon name={published ? 'check' : 'arrow'} />
          </button>
        </div>
      </header>
      <div className="wm-context">
        <span>
          <b>Website</b>
          <span className="wm-slash">/</span>Home page
        </span>
        <div>
          <span className="wm-private-dot" />
          Private editing workspace
          <Link href="/website-preview?version=published" target="_blank" rel="noreferrer">
            View published page ↗
          </Link>
        </div>
      </div>
      {notice && (
        <div
          className={error ? 'wm-notice wm-error' : 'wm-notice'}
          role={error ? 'alert' : 'status'}
        >
          <Icon name={error ? 'close' : 'check'} />
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice('')}>
            <Icon name="close" />
          </button>
        </div>
      )}
      <div className={'wm-workspace' + (expanded ? ' wm-expanded' : '')}>
        <aside className="wm-sidebar">
          <p className="wm-nav-label">HOME PAGE</p>
          <nav aria-label="Website sections">
            {sections.map((s, index) => (
              <button
                aria-current={active === s.id ? 'page' : undefined}
                className={active === s.id ? 'is-active' : ''}
                key={s.id}
                onClick={() => {
                  setActive(s.id);
                  setSelectedField('');
                }}
              >
                <span className="wm-section-number">{String(index + 1).padStart(2, '0')}</span>
                <span>{s.label}</span>
                <Icon name="arrow" />
              </button>
            ))}
          </nav>
          <div className="wm-nav-bottom">
            <button
              className={active === 'seo' ? 'is-active' : ''}
              onClick={() => setActive('seo')}
            >
              <Icon name="globe" />
              Search & sharing
            </button>
            <button
              className={active === 'history' ? 'is-active' : ''}
              onClick={() => setActive('history')}
            >
              <span aria-hidden="true">↶</span>Version history
            </button>
          </div>
          <Link className="wm-return" href="/dashboard" onClick={confirmLeave}>
            <Icon name="back" />
            Back to workspace
          </Link>
        </aside>
        <section className="wm-editor" aria-label="Section editor">
          <div className="wm-editor-heading">
            <span className="wm-kicker">
              {active === 'seo' || active === 'history' ? 'WEBSITE SETTINGS' : 'HOME PAGE SECTION'}
            </span>
            <h2>
              {active === 'seo'
                ? 'Search & sharing'
                : active === 'history'
                  ? 'Version history'
                  : section.label}
            </h2>
            <p>
              {active === 'seo'
                ? 'Choose how your home page appears in search and social posts.'
                : active === 'history'
                  ? 'Return to an earlier version without changing the live site.'
                  : section.description}
            </p>
          </div>
          <fieldset disabled={pending} className="wm-editor-body">
            {active === 'seo' ? (
              <>
                <section className="wm-field-group">
                  <h3>Search appearance</h3>
                  <label className="wm-field">
                    <span>
                      Page title <small>{content.seo.title.length}/160</small>
                    </span>
                    <input
                      value={content.seo.title}
                      maxLength={160}
                      disabled={pending}
                      onChange={(e) =>
                        edit({ ...content, seo: { ...content.seo, title: e.target.value } })
                      }
                    />
                  </label>
                  <label className="wm-field">
                    <span>
                      Page description <small>{content.seo.description.length}/500</small>
                    </span>
                    <textarea
                      rows={4}
                      value={content.seo.description}
                      maxLength={500}
                      disabled={pending}
                      onChange={(e) =>
                        edit({ ...content, seo: { ...content.seo, description: e.target.value } })
                      }
                    />
                  </label>
                  <div className="wm-search-preview">
                    <span>SEARCH RESULT PREVIEW</span>
                    <p>worktello.com</p>
                    <h4>{content.seo.title}</h4>
                    <div>{content.seo.description}</div>
                  </div>
                </section>
                <section className="wm-field-group">
                  <h3>Social sharing image</h3>
                  {imageCard({ label: 'Social sharing image', social: true })}
                </section>
              </>
            ) : active === 'history' ? (
              <div className="wm-history">
                {state.history.length === 0 ? (
                  <div className="wm-empty">
                    <span>↶</span>
                    <h3>Your history starts here</h3>
                    <p>Saved drafts and published versions will appear here.</p>
                  </div>
                ) : (
                  state.history.map((v, index) => (
                    <article key={v.revision}>
                      <div>
                        <b>Version {v.revision}</b>
                        {index === 0 && <span className="wm-tag">Latest</span>}
                        <p>
                          {v.operation === 'publish'
                            ? 'Published'
                            : v.operation === 'restore'
                              ? 'Restored draft'
                              : 'Draft saved'}{' '}
                          ·{' '}
                          {new Date(v.at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <button
                        className="wm-btn wm-btn-small"
                        disabled={pending || dirty}
                        onClick={() => run('restore', v.revision)}
                      >
                        Restore draft
                      </button>
                    </article>
                  ))
                )}
                {dirty && (
                  <p className="wm-hint">Save your current changes before restoring a version.</p>
                )}
              </div>
            ) : (
              <>
                {renderFields(section)}
                {section.links && (
                  <section className="wm-field-group">
                    <h3>Button links</h3>
                    {section.links.map((link) => (
                      <label key={link.key} className="wm-field">
                        <span>{link.label}</span>
                        <input
                          disabled={pending}
                          value={
                            content.links[section.id + '::' + link.key] ??
                            content.links[link.key] ??
                            link.fallback
                          }
                          onChange={(e) =>
                            edit({
                              ...content,
                              links: {
                                ...content.links,
                                [section.id + '::' + link.key]: e.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </section>
                )}
                {section.images && (
                  <section className="wm-field-group">
                    <h3>Section images</h3>
                    {section.images.map((image) => imageCard(image))}
                  </section>
                )}
                {active === 'faq' && (
                  <section className="wm-field-group">
                    <h3>
                      Questions <span className="wm-count">{content.faq.length}</span>
                    </h3>
                    {content.faq.map(([question, answer], index) => (
                      <details
                        className="wm-faq"
                        key={index}
                        open={index === 0 || index === newQuestion}
                      >
                        <summary>
                          <span>{index + 1}.</span>
                          {question || 'New question'}
                        </summary>
                        <div>
                          <label className="wm-field">
                            <span>Question</span>
                            <input
                              disabled={pending}
                              value={question}
                              maxLength={300}
                              onChange={(e) =>
                                edit({
                                  ...content,
                                  faq: content.faq.map((v, i) =>
                                    i === index ? [e.target.value, v[1]] : v,
                                  ),
                                })
                              }
                            />
                          </label>
                          <label className="wm-field">
                            <span>Answer</span>
                            <textarea
                              rows={4}
                              disabled={pending}
                              value={answer}
                              maxLength={5000}
                              onChange={(e) =>
                                edit({
                                  ...content,
                                  faq: content.faq.map((v, i) =>
                                    i === index ? [v[0], e.target.value] : v,
                                  ),
                                })
                              }
                            />
                          </label>
                          <div className="wm-faq-actions">
                            <button
                              disabled={pending || index === 0}
                              onClick={() => {
                                const faq = [...content.faq];
                                [faq[index - 1], faq[index]] = [faq[index], faq[index - 1]];
                                edit({ ...content, faq });
                              }}
                            >
                              ↑ Move up
                            </button>
                            <button
                              disabled={pending || index === content.faq.length - 1}
                              onClick={() => {
                                const faq = [...content.faq];
                                [faq[index + 1], faq[index]] = [faq[index], faq[index + 1]];
                                edit({ ...content, faq });
                              }}
                            >
                              ↓ Move down
                            </button>
                            <button
                              className="wm-remove"
                              disabled={pending}
                              onClick={() =>
                                edit({ ...content, faq: content.faq.filter((_, i) => i !== index) })
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </details>
                    ))}
                    <button
                      className="wm-btn wm-add"
                      disabled={pending || content.faq.length >= 50}
                      onClick={() => {
                        setNewQuestion(content.faq.length);
                        edit({ ...content, faq: [...content.faq, ['', '']] });
                      }}
                    >
                      + Add question
                    </button>
                  </section>
                )}
              </>
            )}
          </fieldset>
        </section>
        <section className="wm-preview" aria-label="Website preview">
          <header>
            <div>
              <span className="wm-preview-dot" />
              <b>Live preview</b>
            </div>
            <div className="wm-device" aria-label="Preview size">
              <button
                aria-label="Desktop preview"
                aria-pressed={device === 'desktop'}
                onClick={() => setDevice('desktop')}
              >
                <Icon name="desktop" />
              </button>
              <button
                aria-label="Mobile preview"
                aria-pressed={device === 'mobile'}
                onClick={() => setDevice('mobile')}
              >
                <Icon name="mobile" />
              </button>
            </div>
            <button className="wm-expand" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Back to editing' : 'Expand'} ↗
            </button>
          </header>
          <div className="wm-preview-hint">
            Changes appear as you type. Click text in the preview to edit it.
          </div>
          <div className="wm-preview-viewport" ref={viewport}>
            <div
              className={'wm-preview-device ' + (device === 'mobile' ? 'wm-phone' : '')}
              style={{ width: previewWidth * scale, height: 'calc(100% - 40px)' }}
            >
              <div className="wm-browser-bar">
                <i />
                <i />
                <i />
                <span>worktello.com</span>
              </div>
              <iframe
                ref={frame}
                title="Live website preview"
                src="/website-preview"
                onLoad={sendPreview}
                style={{
                  width: previewWidth,
                  height: 'calc((100% - 24px) / ' + scale + ')',
                  transform: 'scale(' + scale + ')',
                  transformOrigin: 'top left',
                }}
              />
            </div>
          </div>
          <footer>
            <span>{device === 'desktop' ? 'Desktop · 1440 px' : 'Mobile · 390 px'}</span>
            <span>Preview only · changes are not public</span>
          </footer>
        </section>
      </div>
      {target && (
        <div
          className="wm-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && !pending) setTarget(null);
          }}
        >
          <section
            className="wm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose an image"
          >
            <header>
              <div>
                <span className="wm-kicker">IMAGE LIBRARY</span>
                <h2>{target.label}</h2>
              </div>
              <button
                className="wm-icon-button"
                aria-label="Close image library"
                disabled={pending}
                onClick={() => setTarget(null)}
              >
                <Icon name="close" />
              </button>
            </header>
            <div className="wm-library-tools">
              <div className="wm-library-tabs">
                <button
                  aria-pressed={gallery === 'uploaded'}
                  onClick={() => setGallery('uploaded')}
                >
                  Your uploads <span>{library.length}</span>
                </button>
                <button aria-pressed={gallery === 'website'} onClick={() => setGallery('website')}>
                  Website images
                </button>
              </div>
              <button
                className="wm-btn wm-primary"
                disabled={pending}
                onClick={() => upload.current?.click()}
              >
                {pending ? 'Uploading…' : '+ Upload image'}
              </button>
              <input
                hidden
                ref={upload}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload image"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  start(async () => {
                    try {
                      const form = new FormData();
                      form.set('image', file);
                      const result = await uploadImage(form);
                      if (!result.ok) throw new Error(result.error);
                      setLibrary((current) => [result.url, ...current]);
                      chooseImage(result.url);
                      setNotice('Image added to your draft. Save when you’re ready.');
                    } catch (error) {
                      setError(true);
                      setNotice(error instanceof Error ? error.message : 'Upload failed');
                    }
                  });
                  e.target.value = '';
                }}
              />
            </div>
            <p className="wm-library-note">
              PNG, JPEG or WebP · up to 700 KB. Uploaded images stay private until you publish.
            </p>
            <div className="wm-gallery">
              {(gallery === 'uploaded' ? library : websiteImages).map((url, index) => (
                <button
                  key={url}
                  className="wm-gallery-item"
                  disabled={pending}
                  onClick={() => chooseImage(url)}
                >
                  <div>
                    <Image src={url} alt={'Image ' + (index + 1)} fill sizes="180px" unoptimized />
                  </div>
                  <span>
                    {gallery === 'uploaded'
                      ? 'Uploaded image ' + (index + 1)
                      : (imageLabels.get(url) ?? 'Website image')}
                  </span>
                </button>
              ))}
              {gallery === 'uploaded' && !library.length && (
                <div className="wm-empty">
                  <Icon name="image" />
                  <h3>Your images belong here</h3>
                  <p>Upload an image or choose one from the website library.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
      {leaving && (
        <div className="wm-modal-backdrop">
          <section
            className="wm-modal wm-publish-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Save before leaving"
          >
            <h2>Save your changes?</h2>
            <p>
              Your latest edits have not been saved. Keep them as a draft before returning to
              Worktello.
            </p>
            <div>
              <button className="wm-btn" disabled={pending} onClick={() => setLeaving(false)}>
                Keep editing
              </button>
              <button className="wm-btn wm-primary" disabled={pending} onClick={() => run('save')}>
                Save & leave
              </button>
            </div>
            <button
              className="wm-discard"
              disabled={pending}
              onClick={() => router.push('/dashboard')}
            >
              Leave without saving
            </button>
          </section>
        </div>
      )}
      {confirmPublish && (
        <div className="wm-modal-backdrop">
          <section
            className="wm-modal wm-publish-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Publish website changes"
          >
            <span className="wm-publish-icon">
              <Icon name="globe" />
            </span>
            <h2>Ready to go live?</h2>
            <p>
              Your saved draft will replace the current home page on <b>worktello.com</b>. You can
              restore an earlier version from history.
            </p>
            <div>
              <button
                className="wm-btn"
                disabled={pending}
                onClick={() => setConfirmPublish(false)}
              >
                Keep editing
              </button>
              <button
                className="wm-btn wm-primary"
                disabled={pending}
                onClick={() => run('publish')}
              >
                {pending ? 'Publishing…' : 'Publish changes'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
