console.log("Viento hover.js v3 loaded");

(function () {
  // Avoid running the feature more than once
  if (window.vientoHoverLoaded) return;
  window.vientoHoverLoaded = true;

  // Same rule as calm.js: stay off login pages
  if (document.querySelector('input[type="password"]')) {
    console.log("Viento hover: login page detected, staying off");
    return;
  }

  // What counts as something you can click
  const TARGET_SELECTOR = [
    'a[href]',
    'button',
    '[role="button"]',
    '[role="link"]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    'summary'
  ].join(',');

  const HOVER_DELAY = 250;     // ms the pointer must rest before speaking
  const MAX_LABEL_LENGTH = 100;
  const GROW_CLASSES = ['viento-hover-target', 'viento-hover-inline', 'viento-hover-grow', 'viento-hover-solid'];

  // ---------- Settings ----------
  // Defaults work on their own. When a settings popup saves values under
  // "vientoSettings" in chrome.storage.sync (needs the "storage" permission in
  // manifest.json), they are picked up here and updates apply live.
  const SETTINGS_KEY = 'vientoSettings';
  const DEFAULTS = { enabled: true, enlarge: true, speak: true, caption: true, rate: 1, lang: 'en-US' };
  let settings = Object.assign({}, DEFAULTS);

  function applySettings(saved) {
    settings = Object.assign({}, DEFAULTS, saved || {});
    if (!settings.enabled) leave();
  }

  function loadSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) return;
    try {
      chrome.storage.sync.get(SETTINGS_KEY, (res) => applySettings(res && res[SETTINGS_KEY]));
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes[SETTINGS_KEY]) applySettings(changes[SETTINGS_KEY].newValue);
      });
    } catch (err) {
      console.log('Viento hover: could not read settings, using defaults');
    }
  }

  // ---------- Finding the label to read ----------
  function cleanText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function fallbackName(el) {
    const isLink = el.tagName === 'A' || el.getAttribute('role') === 'link';
    return isLink ? 'link' : 'button';
  }

  function getLabel(el) {
    // 1. Explicit accessible name
    const ariaLabel = cleanText(el.getAttribute('aria-label'));
    if (ariaLabel) return ariaLabel;

    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = cleanText(labelledBy.split(/\s+/).map((id) => {
        const node = document.getElementById(id);
        return node ? node.textContent : '';
      }).join(' '));
      if (text) return text;
    }

    // 2. Visible text (input buttons keep it in `value`)
    if (el.tagName === 'INPUT') {
      const value = cleanText(el.value);
      if (value) return value;
    }
    const text = cleanText(el.innerText || el.textContent);
    if (text) return text;

    // 3. Icon-only buttons: image alt, svg title, then title attribute
    const img = el.querySelector('img[alt]');
    if (img && cleanText(img.alt)) return cleanText(img.alt);
    const svgTitle = el.querySelector('svg title');
    if (svgTitle && cleanText(svgTitle.textContent)) return cleanText(svgTitle.textContent);
    const title = cleanText(el.getAttribute('title'));
    if (title) return title;

    // 4. Nothing found
    return fallbackName(el);
  }

  // ---------- On-screen messages ----------
  // Both boxes sit in the bottom-left corner and ignore the mouse, so they can
  // never get in the way of what is being hovered.
  const BOX_STYLE = 'all: initial; position: fixed; left: 16px; z-index: 2147483647;' +
    'background: #0f5257; color: #ffffff; font: 16px Arial, sans-serif; padding: 10px 14px;' +
    'border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);' +
    'max-width: 60vw; pointer-events: none;';

  // Caption: shows the words being read, so you can see what Viento is saying
  let captionEl = null;

  function showCaption(text) {
    if (!settings.caption) return;
    if (!captionEl) {
      captionEl = document.createElement('div');
      captionEl.setAttribute('aria-hidden', 'true'); // screen readers don't need it twice
      captionEl.style.cssText = BOX_STYLE + 'bottom: 16px;';
    }
    captionEl.textContent = 'Reading: ' + text;
    if (!captionEl.isConnected) document.documentElement.appendChild(captionEl);
  }

  function hideCaption() {
    if (captionEl) captionEl.remove();
  }

  // Hint: explains a problem, at most once every 8 seconds
  let lastHintTime = 0;

  function showHint(message) {
    if (Date.now() - lastHintTime < 8000) return;
    lastHintTime = Date.now();
    const note = document.createElement('div');
    note.setAttribute('role', 'status');
    note.textContent = message;
    note.style.cssText = BOX_STYLE + 'bottom: 72px;';
    document.documentElement.appendChild(note);
    setTimeout(() => note.remove(), 6000);
  }

  // ---------- Speaking ----------
  // Preferred: Chrome's own voice through the background worker (hover/background.js).
  // Backup: the page's built-in speech, which Chrome only allows after one click.
  let speakTimer = null;
  let speakToken = 0;          // changes whenever speech is stopped, so late replies are ignored
  let activeUtterance = null;  // keep a reference: Chrome can silently drop speech if it is garbage collected

  function extensionVoiceAvailable() {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id &&
      typeof chrome.runtime.sendMessage === 'function';
  }

  function speakWithBrowserVoice(text, lang, rate) {
    if (!('speechSynthesis' in window)) {
      showHint('Viento: this browser cannot read aloud');
      return;
    }
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
      console.log('Viento hover: click anywhere on the page once to allow read-aloud');
      showHint('Viento: click anywhere on the page once to turn on the voice');
      return;
    }

    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return; // normal when moving on
      console.log('Viento hover: speech error:', event.error);
      showHint(event.error === 'not-allowed'
        ? 'Viento: click anywhere on the page once to turn on the voice'
        : 'Viento: the voice could not start (' + event.error + ')');
    };
    activeUtterance = utterance;
    synth.speak(utterance);
  }

  function speak(label) {
    const text = label.slice(0, MAX_LABEL_LENGTH);
    const lang = settings.lang;
    const rate = Math.min(2, Math.max(0.5, Number(settings.rate) || 1));
    const token = ++speakToken;

    showCaption(text);

    if (extensionVoiceAvailable()) {
      try {
        chrome.runtime.sendMessage({ type: 'viento-speak', text, lang, rate }, (reply) => {
          const problem = chrome.runtime.lastError ? chrome.runtime.lastError.message : (reply && reply.ok ? '' : (reply && reply.error) || 'no reply');
          if (!problem || token !== speakToken) return; // worked, or the visitor already moved on
          console.log('Viento hover: extension voice failed (' + problem + '), trying the browser voice');
          speakWithBrowserVoice(text, lang, rate);
        });
        return;
      } catch (err) {
        console.log('Viento hover: could not reach the extension voice, trying the browser voice');
      }
    }
    speakWithBrowserVoice(text, lang, rate);
  }

  function stopSpeaking() {
    clearTimeout(speakTimer);
    speakToken++;
    hideCaption();
    if (extensionVoiceAvailable()) {
      try {
        chrome.runtime.sendMessage({ type: 'viento-stop' }, () => void chrome.runtime.lastError);
      } catch (err) { /* extension was reloaded; nothing to stop */ }
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  // ---------- Enlarging ----------
  function applyEnlarge(el) {
    el.classList.add('viento-hover-target'); // the ring is always shown

    const rect = el.getBoundingClientRect();
    // Huge elements (full-width cards, banners) would overflow the page if scaled
    if (rect.width > window.innerWidth * 0.4 || rect.height > 160) return;

    if (window.getComputedStyle(el).display === 'inline') {
      // A link that wraps over several lines would jump if made inline-block
      if (el.getClientRects().length > 1) return;
      el.classList.add('viento-hover-inline');
    }
    // Enlarged text always gets a solid background, so it is easy to read
    // and whatever is behind it is covered
    el.classList.add('viento-hover-grow', 'viento-hover-solid');
  }

  // ---------- Enter / leave ----------
  let current = null;

  function enter(el) {
    current = el;
    if (settings.enlarge) applyEnlarge(el);
    if (settings.speak) {
      speakTimer = setTimeout(() => speak(getLabel(el)), HOVER_DELAY);
    }
  }

  function leave() {
    if (!current) return;
    current.classList.remove(...GROW_CLASSES);
    current = null;
    stopSpeaking();
  }

  // composedPath() lets this also see buttons inside Viento's focus view (Shadow DOM)
  function findTarget(event) {
    const path = event.composedPath ? event.composedPath() : [event.target];
    for (const node of path) {
      if (node.nodeType === 1 && node.matches(TARGET_SELECTOR)) return node;
    }
    return null;
  }

  document.addEventListener('mouseover', (event) => {
    if (!settings.enabled) return;
    const target = findTarget(event);
    if (target === current) return;
    leave();
    if (target) enter(target);
  }, true);

  // Pointer left the page, window lost focus, or the visitor clicked: stop
  document.documentElement.addEventListener('mouseleave', leave);
  window.addEventListener('blur', leave);
  window.addEventListener('pagehide', stopSpeaking);
  document.addEventListener('click', stopSpeaking, true);

  loadSettings();
})();
