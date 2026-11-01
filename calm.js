console.log("Viento calm.js version 5 loaded");

const CLUTTER_SELECTORS = [
  '[id*="cookie"]',
  '[class*="cookie"]',
  '[class*="newsletter"]',
  '[class*="popup"]',
  'ins.adsbygoogle',
  '[id^="google_ads"]',
  '[data-ad-slot]',
  '[data-ad-unit]',
  '[aria-label="Advertisement"]',
  '[class*="advert"]',
  '[class*="ad-slot"]',
  '[class*="ad-container"]',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]'
];

const hiddenItems = new Set();
let paused = false;
let canFocus = false;

let bar = null;
let message = null;
let toggleBtn = null;
let focusBtn = null;

function isSafeToHide(el) {
  if (el === document.body || el === document.documentElement) return false;
  if (el.querySelector('main, article, form')) return false;
  return true;
}

function declutter() {
  if (paused) return;
  let count = 0;
  document.querySelectorAll(CLUTTER_SELECTORS.join(',')).forEach((el) => {
    if (hiddenItems.has(el)) return;
    if (!isSafeToHide(el)) return;
    el.classList.add('viento-hidden');
    hiddenItems.add(el);
    count++;
  });
  if (count > 0) {
    console.log(`Viento hid ${count} new items`);
    updateBar();
  }
}

function createBar() {
  bar = document.createElement('div');
  bar.id = 'viento-bar';

  message = document.createElement('span');
  message.setAttribute('aria-live', 'polite');

  toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.addEventListener('click', toggleHidden);

  focusBtn = document.createElement('button');
  focusBtn.type = 'button';
  focusBtn.textContent = 'Focus view';
  focusBtn.addEventListener('click', openFocusView);

  bar.append(message, toggleBtn, focusBtn);
  document.body.appendChild(bar);
}

function updateBar() {
  if (!bar) createBar();
  const n = hiddenItems.size;
  message.textContent = n > 0
    ? `Viento hid ${n} item${n === 1 ? '' : 's'}`
    : 'Viento is on';
  toggleBtn.textContent = paused ? 'Hide again' : 'Show again';
  toggleBtn.hidden = n === 0;
  focusBtn.hidden = !canFocus;
}

function toggleHidden() {
  paused = !paused;
  hiddenItems.forEach((el) => el.classList.toggle('viento-hidden', !paused));
  updateBar();
  if (!paused) declutter();
}

let timer = null;
function watchForNewClutter() {
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(declutter, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.querySelector('input[type="password"]')) {
  console.log("Viento: login page detected, staying off");
} else {
  canFocus = typeof isProbablyReaderable === 'function' && isProbablyReaderable(document);
  declutter();
  watchForNewClutter();
  if (canFocus) updateBar();
}