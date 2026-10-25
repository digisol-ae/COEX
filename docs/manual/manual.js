(() => {
  'use strict';
  const data = window.WORKTELLO_MANUAL;
  const $ = (id) => document.getElementById(id);
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const storageKey = 'worktello-manual-progress-v1';
  let progress = {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) progress = saved;
  } catch {
    /* Reading works when storage is unavailable. */
  }
  let active = data.chapters.some((c) => c.id === location.hash.slice(1))
    ? location.hash.slice(1)
    : 'start';
  let printing = false;
  const get = (id) => data.chapters.find((c) => c.id === id);
  const isPending = (status) => /pending|in progress/i.test(status);
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      /* No account data is stored. */
    }
  };
  function matches() {
    const q = $('search').value.trim().toLowerCase();
    const role = $('role').value;
    const text = (c) =>
      [
        c.id,
        c.title,
        c.group,
        c.intro,
        ...c.steps.flatMap((s) => [s.title, s.text]),
        ...c.notes,
        c.id === 'resolutions' ? JSON.stringify(data.resolutions) : '',
      ]
        .join(' ')
        .toLowerCase();
    const score = (c) => (c.id === q ? 0 : c.title.toLowerCase().includes(q) ? 1 : 2);
    return data.chapters
      .filter((c) => (role === 'All' || c.roles.includes(role)) && (!q || text(c).includes(q)))
      .sort((a, b) => (q ? score(a) - score(b) : 0));
  }
  function nav() {
    const found = matches();
    $('result-count').textContent = `${found.length} of ${data.chapters.length} chapters`;
    let last = '';
    $('chapters').innerHTML = found.length
      ? found
          .map((c) => {
            const group = c.group !== last ? `<p class="nav-group">${esc(c.group)}</p>` : '';
            last = c.group;
            return `${group}<button data-chapter="${esc(c.id)}" ${c.id === active ? 'aria-current="page"' : ''}>${esc(c.title)}</button>`;
          })
          .join('')
      : '<p class="empty">No matching chapters. Try a shorter word or choose Everyone.</p>';
    $('chapters')
      .querySelectorAll('button')
      .forEach((b) => b.addEventListener('click', () => open(b.dataset.chapter, true)));
    return found;
  }
  function resolutionCards() {
    return (
      '<h2>Resolution register</h2>' +
      data.resolutions
        .map(
          (r) =>
            `<section class="resolution"><p class="date">${esc(r.date)}</p><h3>${esc(r.title)}</h3><span class="pill ${isPending(r.status) ? 'pending' : ''}">${esc(r.status)}</span><dl><dt>Problem</dt><dd>${esc(r.symptom)}</dd><dt>Reason</dt><dd>${esc(r.cause)}</dd><dt>Resolution</dt><dd>${esc(r.fix)}</dd><dt>Verification</dt><dd>${esc(r.verification)}</dd></dl><a href="${esc(r.record)}">Technical resolution record (.md) ↗</a></section>`,
        )
        .join('')
    );
  }
  function article(c, all = false) {
    const checked = c.steps.filter((_, i) => progress[`${c.id}:${i}`]).length;
    const position = data.chapters.indexOf(c);
    return `<article class="${all ? 'print-section' : ''}"><div class="breadcrumb"><span>${esc(c.group)}</span><span> / ${esc(c.roles.join(' · '))}</span><span class="pill ${isPending(c.status) ? 'pending' : ''}">${esc(c.status)}</span></div><h1>${esc(c.title)}</h1><p class="intro">${esc(c.intro)}</p><div class="reading"><span id="progress-label">${checked}/${c.steps.length} steps read</span><progress max="${c.steps.length}" value="${checked}" aria-label="Steps read"></progress><span>Reading progress only</span><button data-reset="${c.id}">Reset chapter ticks</button></div><h2>Step by step</h2>${c.steps.map((s, i) => `<section class="step ${progress[`${c.id}:${i}`] ? 'done' : ''}"><span class="number">${i + 1}</span><div><h3 id="step-${c.id}-${i}">${esc(s.title)}</h3><p>${esc(s.text)}</p></div><input type="checkbox" data-progress="${c.id}:${i}" aria-labelledby="step-${c.id}-${i}" ${progress[`${c.id}:${i}`] ? 'checked' : ''}></section>`).join('')}${c.notes.length ? `<div class="notes"><strong>Know before you act</strong>${c.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''}${c.images.length ? `<h2>Actual application screens</h2>${c.images.map(([src, caption]) => `<figure class="screen"><button data-image="${esc(src)}" data-caption="${esc(caption)}" aria-label="Enlarge screenshot: ${esc(caption)}"><img src="assets/${esc(src)}" alt="${esc(caption)}" loading="lazy"></button><figcaption>${esc(caption)} · Select to enlarge</figcaption></figure>`).join('')}` : ''}${c.id === 'resolutions' ? resolutionCards() : ''}${c.sources.length ? `<h2>Open the app or read more</h2><div class="links">${c.sources.map(([label, href]) => `<a href="${esc(href)}" ${href.startsWith('https:') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${esc(label)} ↗</a>`).join('')}</div>` : ''}${c.related.length ? `<h2>Related guides</h2><div class="related">${c.related.map((id) => `<a href="#${esc(id)}">${esc(get(id).title)}</a>`).join('')}</div>` : ''}${all ? '' : `<div class="bottom-nav">${position > 0 ? `<a href="#${data.chapters[position - 1].id}">← ${esc(data.chapters[position - 1].title)}</a>` : '<span></span>'}${position < data.chapters.length - 1 ? `<a href="#${data.chapters[position + 1].id}">${esc(data.chapters[position + 1].title)} →</a>` : ''}</div>`}</article>`;
  }
  function bind() {
    $('article')
      .querySelectorAll('[data-progress]')
      .forEach((input) =>
        input.addEventListener('change', () => {
          progress[input.dataset.progress] = input.checked;
          save();
          const top = scrollY;
          render();
          window.scrollTo(0, top);
          $('article')
            .querySelector(`[data-progress="${input.dataset.progress}"]`)
            ?.focus({ preventScroll: true });
        }),
      );
    $('article')
      .querySelectorAll('[data-reset]')
      .forEach((button) =>
        button.addEventListener('click', () => {
          const c = get(button.dataset.reset);
          c.steps.forEach((_, i) => delete progress[`${c.id}:${i}`]);
          save();
          render();
        }),
      );
    $('article')
      .querySelectorAll('[data-image]')
      .forEach((button) =>
        button.addEventListener('click', () => {
          $('zoom-image').src = `assets/${button.dataset.image}`;
          $('zoom-image').alt = button.dataset.caption;
          $('zoom-caption').textContent = button.dataset.caption;
          $('zoom').showModal();
        }),
      );
  }
  function render() {
    const c = get(active) || get('start');
    $('article').innerHTML = article(c);
    document.title = `${c.title} · Worktello manual`;
    bind();
  }
  function open(id, focus) {
    if (!get(id)) return;
    active = id;
    history.replaceState(null, '', `#${id}`);
    nav();
    render();
    document.body.classList.remove('menu-open');
    $('menu').setAttribute('aria-expanded', 'false');
    if (focus) {
      $('article').focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }
  $('search').addEventListener('input', () => {
    const found = nav();
    if (found.length && !found.some((c) => c.id === active)) open(found[0].id, false);
  });
  $('role').addEventListener('change', () => {
    const found = nav();
    if (found.length && !found.some((c) => c.id === active)) open(found[0].id, false);
  });
  $('menu').addEventListener('click', () => {
    const on = document.body.classList.toggle('menu-open');
    $('menu').setAttribute('aria-expanded', String(on));
    if (on) $('chapters').querySelector('button')?.focus();
  });
  $('close-zoom').addEventListener('click', () => $('zoom').close());
  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) &&
      !$('zoom').open
    ) {
      e.preventDefault();
      $('search').focus();
    }
    if (e.key === 'Escape') {
      document.body.classList.remove('menu-open');
      $('menu').setAttribute('aria-expanded', 'false');
    }
  });
  window.addEventListener('hashchange', () => open(location.hash.slice(1), true));
  $('print').addEventListener('click', async () => {
    printing = true;
    $('article').innerHTML = data.chapters.map((c) => article(c, true)).join('');
    $('article')
      .querySelectorAll('img')
      .forEach((i) => {
        i.loading = 'eager';
      });
    await Promise.all(
      [...$('article').querySelectorAll('img')].map((i) => i.decode().catch(() => {})),
    );
    window.print();
  });
  window.addEventListener('afterprint', () => {
    if (printing) {
      printing = false;
      render();
    }
  });
  nav();
  render();
})();
