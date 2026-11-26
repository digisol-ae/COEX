'use client';
import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { defaultFaq } from '@/components/landing/landing-page';
import assets from '@/components/landing/website-assets.json';
import defaults from '@/components/landing/website-defaults.json';
import type { WebsiteContent } from '@/components/landing/website-schema';
import type { websiteEditor } from '@/modules/core/services/website-content.service';
import { updateWebsite, uploadImage } from './actions';
const initialContent: WebsiteContent = {
  links: { '/register': '/register', '#explore': '#explore' },
  texts: defaults,
  images: Object.fromEntries(assets.map((path) => [path, path])),
  faq: defaultFaq as [string, string][],
  seo: {
    title: 'Worktello — Bring your work together',
    description:
      'Manage projects, track time, organize customers, and handle support in one connected workspace.',
    image: '',
  },
};
export function WebsiteEditor({ initial }: { initial: Awaited<ReturnType<typeof websiteEditor>> }) {
  const [state, setState] = useState(initial),
    [content, setContent] = useState<WebsiteContent>(initial.draft ?? initialContent),
    [message, setMessage] = useState(''),
    [pending, start] = useTransition(),
    [width, setWidth] = useState(1280),
    [preview, setPreview] = useState(false),
    [dirty, setDirty] = useState(false),
    [search, setSearch] = useState(''),
    [uploaded, setUploaded] = useState<string[]>(initial.media.map((m) => m.url));
  function edit(next: WebsiteContent) {
    setContent(next);
    setDirty(true);
    setPreview(false);
  }
  function run(op: 'save' | 'publish' | 'restore', revision?: number) {
    start(async () => {
      try {
        const result = await updateWebsite(
          op,
          state.revision,
          op === 'save' ? content : undefined,
          revision,
        );
        if (!result.ok) throw new Error(result.error);
        const next = result.state;
        setState(next);
        if (next.draft) setContent(next.draft);
        setDirty(false);
        setPreview(false);
        setMessage(
          op === 'publish'
            ? 'Published successfully.'
            : op === 'restore'
              ? 'Version restored to draft. Review and publish when ready.'
              : 'Draft saved.',
        );
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Unable to update website.');
      }
    });
  }
  const field = 'w-full rounded border border-[var(--color-line-strong)] bg-transparent p-2';
  return (
    <fieldset disabled={pending} className="mx-auto max-w-5xl space-y-5 p-4">
      <h1 className="text-2xl font-semibold">Website Content</h1>
      <p>
        Only active platform owners can access drafts and history. Save a draft, preview it, then
        publish explicitly.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" disabled={pending} onClick={() => run('save')}>
          Save draft
        </Button>
        <Button
          variant="secondary"
          disabled={pending || dirty || !state.draft}
          onClick={() => run('publish')}
        >
          Publish saved draft
        </Button>
        <Button
          variant="secondary"
          disabled={dirty || !state.draft}
          onClick={() => setPreview(!preview)}
        >
          Preview saved draft
        </Button>
      </div>
      <p role="status">
        {pending ? 'Saving…' : message}
        {dirty ? ' Unsaved changes.' : ''}
      </p>
      {preview && (
        <div>
          <div className="flex gap-4">
            <Button variant="secondary" onClick={() => setWidth(1280)}>
              Desktop
            </Button>
            <Button variant="secondary" onClick={() => setWidth(390)}>
              Mobile
            </Button>
            <a href="/website-preview" target="_blank" rel="noreferrer">
              Open preview
            </a>
          </div>
          <div className="overflow-auto">
            <iframe
              title="Private website preview"
              src={'/website-preview?revision=' + state.revision}
              style={{ width, height: 720, maxWidth: 'none' }}
            />
          </div>
        </div>
      )}
      <details open>
        <summary>Headings, paragraphs and button labels</summary>
        <label className="block">
          Find content
          <input className={field} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="space-y-3">
          {Object.entries({ ...defaults, ...content.texts })
            .filter(([key]) => key.toLowerCase().includes(search.toLowerCase()))
            .map(([key, value]) => (
              <label className="block" key={key}>
                <span className="block text-sm">{key}</span>
                <textarea
                  className={field}
                  value={value}
                  maxLength={5000}
                  onChange={(e) =>
                    edit({ ...content, texts: { ...content.texts, [key]: e.target.value } })
                  }
                />
              </label>
            ))}
        </div>
      </details>
      <details>
        <summary>Frequently asked questions</summary>
        {content.faq.map(([q, a], i) => (
          <div className="my-4 space-y-2" key={i}>
            <label className="block">
              Question
              <input
                className={field}
                value={q}
                onChange={(e) =>
                  edit({
                    ...content,
                    faq: content.faq.map((v, n) => (n === i ? [e.target.value, v[1]] : v)),
                  })
                }
              />
            </label>
            <label className="block">
              Answer
              <textarea
                className={field}
                value={a}
                onChange={(e) =>
                  edit({
                    ...content,
                    faq: content.faq.map((v, n) => (n === i ? [v[0], e.target.value] : v)),
                  })
                }
              />
            </label>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                disabled={i === 0}
                onClick={() => {
                  const faq = [...content.faq];
                  [faq[i - 1], faq[i]] = [faq[i], faq[i - 1]];
                  edit({ ...content, faq });
                }}
              >
                Move up
              </Button>
              <Button
                variant="secondary"
                disabled={i === content.faq.length - 1}
                onClick={() => {
                  const faq = [...content.faq];
                  [faq[i + 1], faq[i]] = [faq[i], faq[i + 1]];
                  edit({ ...content, faq });
                }}
              >
                Move down
              </Button>
              <Button
                variant="secondary"
                onClick={() => edit({ ...content, faq: content.faq.filter((_, n) => n !== i) })}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            edit({ ...content, faq: [...content.faq, ['New question', 'New answer']] })
          }
        >
          Add question
        </Button>
      </details>
      <details>
        <summary>Search and social sharing</summary>
        {(['title', 'description', 'image'] as const).map((key) => (
          <label key={key} className="block">
            {key}
            <input
              className={field}
              value={content.seo[key]}
              onChange={(e) => edit({ ...content, seo: { ...content.seo, [key]: e.target.value } })}
            />
          </label>
        ))}
      </details>
      <details>
        <summary>Button links</summary>
        {Object.entries(content.links).map(([key, value]) => (
          <label className="block" key={key}>
            {key}
            <input
              className={field}
              list="website-assets"
              value={value}
              onChange={(e) =>
                edit({ ...content, links: { ...content.links, [key]: e.target.value } })
              }
            />
          </label>
        ))}
      </details>
      <details>
        <summary>Images</summary>
        <label className="block">
          Upload a website image (PNG, JPEG or WebP, up to 700 KB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              start(async () => {
                const form = new FormData();
                form.set('image', file);
                const result = await uploadImage(form);
                if (result.ok) {
                  setMessage(
                    'Image uploaded privately. Choose it for an image or the social image, save your draft, then publish.',
                  );
                  setUploaded((current) => [...current, result.url]);
                } else setMessage(result.error);
              });
              event.target.value = '';
            }}
          />
        </label>
        {uploaded.map((url) => (
          <div key={url}>
            <Image
              src={url}
              alt="Uploaded website image"
              width={160}
              height={90}
              unoptimized
              className="object-contain"
            />
            <Button
              variant="secondary"
              onClick={() => edit({ ...content, seo: { ...content.seo, image: url } })}
            >
              Use as social image
            </Button>
          </div>
        ))}
        <datalist id="website-assets">
          {[...assets, ...uploaded].map((path) => (
            <option key={path} value={path} />
          ))}
        </datalist>
        <p>
          Uploads stay private until a saved draft using them is published. SVG illustrations retain
          the supplied design.
        </p>
        {Object.entries(content.images).map(([key, value]) => (
          <label key={key} className="block">
            {key.split('/').pop()}
            <select
              className={field}
              value={value}
              onChange={(e) =>
                edit({ ...content, images: { ...content.images, [key]: e.target.value } })
              }
            >
              {[...new Set([...assets, ...uploaded, ...Object.values(content.images)])].map(
                (url) => (
                  <option key={url} value={url}>
                    {url.startsWith('/api/website-media/')
                      ? 'Uploaded image ' + (uploaded.indexOf(url) + 1)
                      : url.split('/').pop()}
                  </option>
                ),
              )}
            </select>
          </label>
        ))}
      </details>
      <details>
        <summary>Version history</summary>
        <p>Restoring creates a new draft; the live website changes only after Publish.</p>
        {state.history.map((v) => (
          <div className="flex gap-4 py-2" key={v.revision}>
            <span>
              Version {v.revision} · {v.operation} · {v.at}
            </span>
            <Button
              variant="secondary"
              disabled={pending || dirty}
              onClick={() => run('restore', v.revision)}
            >
              Restore to draft
            </Button>
          </div>
        ))}
      </details>
    </fieldset>
  );
}
