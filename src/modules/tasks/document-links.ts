/**
 * Task documents live in Microsoft 365, and COEX stores a link rather than a copy.
 *
 * This keeps one version of a document rather than two that drift apart, keeps SharePoint
 * permissions in charge of who may open it, and keeps the database small. Once Entra single sign
 * on is in place, the same token resolves the title and permissions through Microsoft Graph, and a
 * link the viewer cannot open is flagged rather than silently dead.
 */

const ALLOWED_HOSTS = [
  'sharepoint.com',
  'onedrive.live.com',
  '1drv.ms',
  'office.com',
  'officeapps.live.com',
  'teams.microsoft.com',
];

export interface ParsedDocumentLink {
  url: string;
  suggestedTitle: string;
}

export function parseDocumentLink(input: string): ParsedDocumentLink {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('Paste a document link.');
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('That does not look like a link. Copy the address from your browser.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Document links must start with https.');
  }

  if (!ALLOWED_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new Error(
      'Only Microsoft 365 links are accepted: SharePoint, OneDrive or Teams. Upload the file there first.',
    );
  }

  return { url: url.toString(), suggestedTitle: suggestTitle(url) };
}

/** A usable name before Graph is available to give the real one. */
function suggestTitle(url: URL): string {
  const fromQuery = url.searchParams.get('file') ?? url.searchParams.get('id');
  const candidate = fromQuery ?? url.pathname.split('/').filter(Boolean).pop() ?? 'Document';

  try {
    return decodeURIComponent(candidate).replace(/[+_]/g, ' ').slice(0, 120);
  } catch {
    return candidate.slice(0, 120);
  }
}
