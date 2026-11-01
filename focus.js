console.log("Viento focus.js loaded");

const FOCUS_CSS = `
  .overlay {
    position: fixed; inset: 0; overflow-y: auto;
    background: #faf7f0; color: #1f2933;
    font-family: Arial, sans-serif;
  }
  .page {
    max-width: 680px; margin: 0 auto;
    padding: 64px 20px 96px;
    font-size: 20px; line-height: 1.8; letter-spacing: 0.02em;
  }
  h1 { font-size: 2rem; line-height: 1.3; margin: 0 0 1.2em; }
  .article p { margin: 0 0 1.2em; }
  .article img { max-width: 100%; height: auto; border-radius: 8px; }
  .article a { color: #0f5257; }
  .close {
    position: fixed; top: 16px; right: 16px;
    background: #0f5257; color: #fff; border: 0;
    border-radius: 999px; padding: 10px 18px;
    font: bold 16px Arial, sans-serif; cursor: pointer;
  }
  .close:focus-visible { outline: 3px solid #ffbf00; }
`;

let focusHost = null;
let previousOverflow = '';

// Remove anything risky from the article HTML before showing it
function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, link, meta, form')
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

function openFocusView() {
  if (focusHost) return;

  // Readability changes the page it reads, so give it a copy
  const article = new Readability(document.cloneNode(true)).parse();
  if (!article) {
    alert("Viento couldn't find an article on this page.");
    return;
  }

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

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close';
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', closeFocusView);

  const page = document.createElement('div');
  page.className = 'page';

  const title = document.createElement('h1');
  title.textContent = article.title || document.title;

  const body = document.createElement('div');
  body.className = 'article';
  body.append(...sanitize(article.content).childNodes);

  page.append(title, body);
  overlay.append(closeBtn, page);
  shadow.append(style, overlay);

  document.documentElement.appendChild(focusHost);
  previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  document.addEventListener('keydown', closeOnEscape);
  closeBtn.focus();
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
}