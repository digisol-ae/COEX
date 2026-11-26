import { z } from 'zod';
import assets from './website-assets.json';
export const websiteImage = z
  .string()
  .max(400)
  .refine(
    (v) =>
      v === '' ||
      assets.includes(v) ||
      /^\/api\/website-media\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(v),
    'Choose a website image or upload a PNG, JPEG or WebP.',
  );
export const websiteLink = z
  .string()
  .max(1000)
  .refine(
    (v) =>
      /^(\/(?!\/)[a-zA-Z0-9_/?=&%.-]*|#[a-zA-Z0-9_-]+|mailto:[a-zA-Z0-9@.?=&%_+-]+|https:\/\/[^\s\\]+)$/.test(
        v,
      ),
    'Use a local path, anchor, email or HTTPS URL.',
  );
export const websiteSchema = z
  .object({
    links: z.record(z.string().max(1000), websiteLink).default({}),
    texts: z.record(z.string().max(2000), z.string().max(5000)),
    images: z.record(z.string().max(400), websiteImage),
    faq: z
      .array(z.tuple([z.string().trim().min(1).max(300), z.string().trim().min(1).max(5000)]))
      .max(50),
    seo: z.object({
      title: z.string().trim().min(1).max(160),
      description: z.string().max(500),
      image: websiteImage,
    }),
  })
  .strict();
export type WebsiteContent = z.infer<typeof websiteSchema>;
