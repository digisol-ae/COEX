'use client';
/* eslint-disable @next/next/no-img-element -- Locally preview and display a private signature image. */
import { useRef, useState, useTransition, type PointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { SIGNATURE_STYLES, type SignatureMethod } from '@coex/shared/crm/signature-capture';
import { signAgreementAction } from './actions';

export function SignForm({ token, consentText }: { token: string; consentText: string }) {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<SignatureMethod>('drawn');
  const [styleIndex, setStyle] = useState(0);
  const [drawn, setDrawn] = useState(false);
  const [upload, setUpload] = useState('');
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const router = useRouter();
  const style = SIGNATURE_STYLES[styleIndex];
  const ready =
    name.trim().length >= 2 &&
    consent &&
    (method === 'typed' || (method === 'drawn' ? drawn : Boolean(upload)));
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * 1000) / rect.width,
      y: ((e.clientY - rect.top) * 600) / rect.height,
    };
  }
  function begin(e: PointerEvent<HTMLCanvasElement>) {
    if (pending || pointer.current !== null || (e.pointerType === 'mouse' && e.button !== 0))
      return;
    e.preventDefault();
    pointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = (2.5 * 1000) / e.currentTarget.getBoundingClientRect().width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (pointer.current !== e.pointerId) return;
    e.preventDefault();
    const p = point(e),
      ctx = e.currentTarget.getContext('2d');
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
    setDrawn(true);
  }
  function end(e: PointerEvent<HTMLCanvasElement>) {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return (
    <form
      className="space-y-5 border-t pt-6 print:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) {
          setMessage('Enter your full name, add a signature and accept the agreement.');
          return;
        }
        start(async () => {
          const result = await signAgreementAction(token, name, consent, {
            method,
            style: styleIndex,
            imageDataUrl:
              method === 'drawn'
                ? canvas.current?.toDataURL('image/png')
                : method === 'uploaded'
                  ? upload
                  : undefined,
          });
          if (result.error) setMessage(result.error);
          else {
            setUpload('');
            setMessage('Agreement signed.');
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-xl font-semibold">Your signature</h2>
      <label className="block space-y-2 text-sm font-medium">
        Your full name
        <input
          aria-label="Your full name"
          className="min-h-12 w-full rounded border bg-white px-3 text-base text-[#111111]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          autoComplete="name"
        />
      </label>
      <fieldset disabled={pending} className="space-y-4">
        <legend className="mb-3 text-sm font-medium">Choose how to sign</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['drawn', 'Draw'],
              ['uploaded', 'Upload'],
              ['typed', 'Type / style'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded border px-2 text-sm ${method === value ? 'border-[#123456] bg-[#edf3f8] font-semibold' : 'bg-white'}`}
            >
              <input
                type="radio"
                name="signatureMethod"
                value={value}
                checked={method === value}
                onChange={() => {
                  setMethod(value);
                  setMessage('');
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <div hidden={method !== 'drawn'} className="space-y-3">
          <p className="text-sm">
            Sign in the box using your finger, stylus, mouse or trackpad. Use Type / style if
            drawing is difficult.
          </p>
          <canvas
            ref={canvas}
            width={1000}
            height={600}
            role="img"
            aria-label="Draw your signature using a finger, stylus or mouse"
            className="w-full max-w-[600px] rounded border-2 border-dashed border-slate-400 bg-white"
            style={{ height: 'auto', touchAction: 'none' }}
            onPointerDown={begin}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={() => {
              pointer.current = null;
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="min-h-12"
            onClick={() => {
              canvas.current?.getContext('2d')?.clearRect(0, 0, 1000, 600);
              setDrawn(false);
            }}
          >
            Clear drawing
          </Button>
        </div>
        <div hidden={method !== 'uploaded'} className="space-y-3">
          <label className="block space-y-2 text-sm">
            Upload a picture of your signature
            <input
              aria-label="Upload signature image"
              className="block min-h-12 w-full max-w-full rounded border bg-white p-3 text-sm"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                setUpload('');
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  file.size > 2 * 1024 * 1024 ||
                  !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
                ) {
                  setMessage('Choose a PNG, JPEG or WebP signature image of at most 2 MB.');
                  e.target.value = '';
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setUpload(String(reader.result));
                  setMessage('');
                };
                reader.onerror = () =>
                  setMessage('This image could not be read. Choose another image.');
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <p className="text-xs">
            PNG, JPEG or WebP, up to 2 MB. Crop the picture to your signature; avoid including
            identity documents or other personal information.
          </p>
          {upload && (
            <div className="rounded border bg-white p-4">
              <img
                src={upload}
                alt="Your uploaded signature preview"
                className="mx-auto max-h-48 max-w-full object-contain"
              />
            </div>
          )}
        </div>
        <div hidden={method !== 'typed'} className="space-y-3">
          <label className="block space-y-2 text-sm">
            Signature style
            <select
              aria-label="Signature style"
              className="min-h-12 w-full rounded border bg-white px-3 text-base"
              value={styleIndex}
              onChange={(e) => setStyle(Number(e.target.value))}
            >
              {SIGNATURE_STYLES.map((s, i) => (
                <option value={i} key={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div
            aria-label="Typed signature preview"
            className="min-h-28 break-words rounded border bg-white p-5 text-3xl"
            style={{ fontFamily: style.font, fontStyle: style.italic ? 'italic' : 'normal' }}
          >
            {name.trim() || 'Your signature'}
          </div>
        </div>
      </fieldset>
      <label className="flex min-h-12 items-start gap-3 text-sm leading-relaxed">
        <input
          className="mt-1 size-5 shrink-0"
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>{consentText}</span>
      </label>
      <p className="text-xs leading-relaxed">
        Your chosen signature, name, verified email, document revision, consent and signing time are
        stored with this agreement. Drawing pressure and stroke timings are not recorded. Signature
        images are not saved as a reusable signature profile.{' '}
        <a className="underline" href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy notice and data requests
        </a>
      </p>
      <Button className="min-h-12 w-full sm:w-auto" disabled={pending || !ready}>
        {pending ? 'Signing…' : 'Sign agreement'}
      </Button>
      {message && <Notice>{message}</Notice>}
    </form>
  );
}
