/** Accept known embed providers or direct HTTPS media; never frame an arbitrary website. */
export function parseVideoLink(value: string): { url: string; embed: boolean } {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443'))
    throw new Error('Use an HTTPS video link.');
  const host = url.hostname.toLowerCase();
  if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be',
      'www.youtube-nocookie.com',
    ].includes(host)
  ) {
    const parts = url.pathname.split('/').filter(Boolean);
    const id =
      host === 'youtu.be'
        ? parts[0]
        : url.pathname === '/watch'
          ? url.searchParams.get('v')
          : ['embed', 'shorts', 'live'].includes(parts[0])
            ? parts[1]
            : null;
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Use a YouTube video link.');
    return { url: `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`, embed: true };
  }
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
    const match = /^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/.exec(url.pathname);
    if (!match) throw new Error('Use a Vimeo video link.');
    const embed = new URL(`https://player.vimeo.com/video/${match[1]}`);
    const hash = match[2] ?? url.searchParams.get('h');
    if (hash && /^[a-zA-Z0-9]+$/.test(hash)) embed.searchParams.set('h', hash);
    embed.searchParams.set('autoplay', '0');
    return { url: embed.toString(), embed: true };
  }
  if (/\.(mp4|webm)$/i.test(url.pathname)) return { url: url.toString(), embed: false };
  throw new Error('Use YouTube, Vimeo, or a direct MP4/WebM link.');
}
