// Viento background worker: speaks text for hover.js using Chrome's own
// text-to-speech (the "tts" permission). Unlike the page's built-in speech,
// this does not need the visitor to click on the page first.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return;

  if (message.type === 'viento-stop') {
    chrome.tts.stop();
    return;
  }
  if (message.type !== 'viento-speak') return;

  const text = String(message.text || '').slice(0, 200);
  const rate = Math.min(2, Math.max(0.5, Number(message.rate) || 1));
  const lang = typeof message.lang === 'string' ? message.lang.slice(0, 15) : 'en-US';

  let replied = false;
  let timer = null;
  function reply(result) {
    if (replied) return;
    replied = true;
    clearTimeout(timer);
    try { sendResponse(result); } catch (err) { /* the page already went away */ }
  }

  // If the voice never starts, tell the page so it can try the browser voice
  timer = setTimeout(() => {
    chrome.tts.stop();
    reply({ ok: false, error: 'voice did not start' });
  }, 2500);

  chrome.tts.stop(); // never overlap voices
  chrome.tts.speak(text, {
    lang,
    rate,
    onEvent: (event) => {
      if (event.type === 'start') reply({ ok: true });
      else if (event.type === 'error') reply({ ok: false, error: event.errorMessage || 'voice error' });
      else if (['interrupted', 'cancelled', 'end'].includes(event.type)) reply({ ok: true });
    }
  }, () => {
    if (chrome.runtime.lastError) reply({ ok: false, error: chrome.runtime.lastError.message });
  });

  return true; // keep the message channel open for the reply
});
