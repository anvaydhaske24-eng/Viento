console.log("Viento focus.js loaded");

const FOCUS_CSS = `
  .overlay {
    position: fixed; inset: 0; overflow-y: auto;
    z-index: 2147483646;
    background: #faf7f0; color: #1f2933;
    font-family: Arial, sans-serif;
  }

  .topbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1;
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 12px 16px;
    background: #faf7f0;
    border-bottom: 1px solid rgba(128, 128, 128, 0.35);
  }
  .topbar button {
    background: #0f5257; color: #fff; border: 0;
    border-radius: 999px; padding: 8px 16px;
    font: bold 16px Arial, sans-serif; cursor: pointer;
  }
  .topbar button:focus-visible { outline: 3px solid #ffbf00; }
  .topbar button[hidden] { display: none; }

  .page {
    max-width: 680px; margin: 0 auto;
    padding: 88px 20px 96px;
    font-size: 20px; line-height: 1.8; letter-spacing: 0.02em;
  }
  h1 { font-size: 1.6em; line-height: 1.3; margin: 0 0 1.2em; }
  .article p { margin: 0 0 1.2em; }
  .article img { max-width: 100%; height: auto; border-radius: 8px; }
  .article a { color: #0f5257; }

  /* Outline view */
  .outline { display: grid; gap: 14px; }
  .outline[hidden], .article[hidden] { display: none; }
  .card {
    border: 2px solid rgba(128, 128, 128, 0.45);
    border-radius: 12px; overflow: hidden;
  }
  .card summary {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 14px; cursor: pointer; list-style: none;
    font-weight: bold; line-height: 1.3;
  }
  .card summary::-webkit-details-marker { display: none; }
  .card summary::after { content: '+'; margin-left: auto; font-size: 1.4em; }
  .card[open] summary::after { content: '\\2212'; }
  .card summary:focus-visible { outline: 3px solid #ffbf00; outline-offset: -3px; }
  .thumb {
    width: 72px; height: 72px; object-fit: cover;
    border-radius: 8px; flex: none;
  }
  .content { padding: 4px 18px 18px; border-top: 1px solid rgba(128, 128, 128, 0.3); }
  .content p { margin: 0 0 1.2em; }
  .content img { max-width: 100%; height: auto; }
`;

let focusHost = null;
let previousOverflow = '';
let openerElement = null;

function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, link, meta, form, .mw-editsection')
    .forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body;
}

// Split the article into sections, one for each h2/h3 heading
function buildSections(root) {
  const doc = root.ownerDocument;
  const headings = Array.from(root.querySelectorAll('h2, h3'));
  const sections = [];
  if (headings.length === 0) return sections;

  function addSection(title, setRange) {
    const range = doc.createRange();
    setRange(range);
    const content = range.cloneContents();
    if ((content.textContent || '').trim().length < 60) return; // skip tiny sections
    sections.push({ title, content });
  }

  addSection('Introduction', (r) => {
    r.setStart(root, 0);
    r.setEndBefore(headings[0]);
  });

  headings.forEach((h, i) => {
    addSection(h.textContent.trim(), (r) => {
      r.setStartAfter(h);
      if (headings[i + 1]) r.setEndBefore(headings[i + 1]);
      else r.setEnd(root, root.childNodes.length);
    });
  });

  return sections;
}

// Turn the sections into a list of expandable cards
function buildOutline(sections) {
  const list = document.createElement('div');
  list.className = 'outline';

  sections.forEach((s) => {
    const card = document.createElement('details');
    card.className = 'card';

    const summary = document.createElement('summary');

    // First image that is big enough to be a real picture, not an icon
    const img = Array.from(s.content.querySelectorAll('img')).find((im) => {
      return parseInt(im.getAttribute('width') || '999', 10) >= 80;
    });
    if (img && img.src) {
      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.src = img.src;
      thumb.alt = '';
      summary.append(thumb);
    }

    const label = document.createElement('span');
    label.textContent = s.title;
    summary.append(label);

    const content = document.createElement('div');
    content.className = 'content';
    content.append(s.content);

    card.append(summary, content);
    list.append(card);
  });

  return list;
}

function makeButton(label, ariaLabel, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('aria-label', ariaLabel);
  b.addEventListener('click', onClick);
  return b;
}

function focusIsOpen() {
  return focusHost !== null;
}

function openFocusView() {
  if (focusHost) return;

  const article = new Readability(document.cloneNode(true)).parse();
  if (!article) {
    alert("Viento couldn't find an article on this page.");
    return;
  }

  openerElement = document.activeElement;

  focusHost = document.createElement('div');
  focusHost.id = 'viento-focus-host';
  const shadow = focusHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = FOCUS_CSS;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Viento focus view');

  // The article, cleaned up
  const page = document.createElement('div');
  page.className = 'page';

  const title = document.createElement('h1');
  title.textContent = article.title || document.title;

  const body = document.createElement('div');
  body.className = 'article';
  body.append(...sanitize(article.content).childNodes);

  // Outline view: cards by heading (only when the article has enough headings)
  const sections = buildSections(body);
  const outline = buildOutline(sections);
  const hasOutline = sections.length >= 3;
  outline.hidden = !hasOutline;
  body.hidden = hasOutline;

  // Top bar: switch view, and exit
  const viewBtn = makeButton('Show full article', 'Switch between outline and full article', () => {
    const showingOutline = !outline.hidden;
    outline.hidden = showingOutline;
    body.hidden = !showingOutline;
    viewBtn.textContent = showingOutline ? 'Show outline' : 'Show full article';
  });
  viewBtn.hidden = !hasOutline;

  const exitBtn = makeButton('Exit focus view', 'Exit focus view and go back to the page', closeFocusView);

  const topbar = document.createElement('div');
  topbar.className = 'topbar';
  topbar.append(viewBtn, exitBtn);

  page.append(title, outline, body);
  overlay.append(topbar, page);
  shadow.append(style, overlay);

  document.documentElement.appendChild(focusHost);
  previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  document.addEventListener('keydown', closeOnEscape);
  exitBtn.focus();
  document.dispatchEvent(new CustomEvent('viento-focus-change'));
}

function closeOnEscape(e) {
  if (e.key === 'Escape') closeFocusView();
}

function closeFocusView() {
  if (!focusHost) return;
  focusHost.remove();
  focusHost = null;
  document.documentElement.style.overflow = previousOverflow;
  document.removeEventListener('keydown', closeOnEscape);
  if (openerElement && openerElement.focus) openerElement.focus();
  openerElement = null;
  document.dispatchEvent(new CustomEvent('viento-focus-change'));
}