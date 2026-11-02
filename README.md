# Viento
Providing a calmer browsing experiance for nuerodivergent minds

## Calm mode

Provides an easier and more focused browsing experience for neurodivergent minds(ADHD, Autism, dyslexia, etc.).

### What it does

- **Hides clutter:** cookie banners, newsletter pop-ups and common ad containers
  are hidden. Items that load late are caught too.
- **"What I hid" bar:** a small bar in the bottom-right corner shows how many
  items were hidden. **Show again** brings them back, and **Hide again** removes
  them again. Nothing is ever deleted from the page.
- **Focus view:** 
1. on article pages, one click opens a clean reading page with
  only the article. Click the button again (or press **Esc**) to return to the
  original page.
2. **Outline view:** if the article has enough headings, Focus view shows one
  card per section, with a thumbnail and heading. Click a card to open only that
  section. **Show full article** switches to the whole text.

### How to use it

1. Open any website with the extension installed.
2. If anything was hidden, the bar appears in the bottom-right corner.
3. On an article page, click **Focus view**. Click **Exit focus view** to leave.

### How it works

| Part | File | What it does |
|---|---|---|
| Clutter hiding and bar | `calm.js`, `calm.css` | Finds clutter using a list of selectors, hides it with a CSS class, and watches the page for new items |
| Focus view | `focus.js` | Extracts the article, cleans it, and shows it in an isolated overlay (Shadow DOM) |
| Article extraction | `Readability.js`, `Readability-readerable.js` | Third-party library (see below) |

### Safety and privacy

- Everything runs **locally in the browser**. Calm mode sends no page content
  anywhere and stores nothing.
- Calm mode **stays off on pages with a password field**, so login forms are
  never touched. 
- Hidden items can always be shown again.
- Article HTML is cleaned (scripts, frames and event handlers removed) before it
  is displayed.

### Known limitations

- Works best on **article-style pages with clear headings**, such as Wikipedia,
  blogs and explainers.
- Focus view does not work on every site. eg., Times of India, Economic Times.
- Ad and clutter detection uses a short list of rules, so it won't catch every
  ad. It is not an ad blocker.
- Outline view needs at least three sections. Otherwise, the full article is shown.

### Tested on

| Site | Hide clutter | Focus view | Outline view |
|---|---|---|---|
| Wikipedia article | 👍 | 👍 | 👍 |
| The Hindu | 👍 | 👍  | - |
| Times of India | 👍 | 👎 | 👎 |
| Economic Times | 👍 | 👎 | 👎 |



## Hover mode

Makes links and buttons easier to see and hear, for people with low vision, limited hand control, or who find it easier to listen than to read.

### What it does

- **Enlarges what you point at:** the link or button under the mouse grows by half and gets a solid teal background, white text and a yellow border. It is easy to read on light and dark pages, and it covers whatever is behind it. It shrinks back when the mouse leaves.
- **Reads it aloud:** after the mouse rests on a link or button for a moment, its label is spoken. Moving away stops the voice, so voices never overlap. Icon-only buttons with no text are read from their hidden label (`aria-label`, image `alt`, or icon title). If there is none, Viento says "button" or "link".
- **Shows a caption:** the words being read also appear in the bottom-left corner, so you can see what Viento is saying.

### How to use it

1. Open any website with the extension installed.
2. Move the mouse over a link or button and hold it still for about a second.
3. The item enlarges, its label is read aloud, and the caption appears.
4. Move the mouse away to stop.

### How it works

| Part | File | What it does |
|---|---|---|
| Hover, label and caption logic | `hover.js` | Watches the mouse, works out the label, enlarges the item and asks for speech |
| Voice | `background.js` | Speaks the label using Chrome's built-in text-to-speech |
| Enlarge and highlight styles | `hover.css` | The teal background, yellow border and grow effect |

If Chrome's extension voice fails, `hover.js` falls back to the page's built-in speech and shows a short message in the corner explaining any problem.

### Safety and privacy

- Viento sends no page content anywhere and stores nothing. Only the label of the item you hover is passed to Chrome's text-to-speech.
- Which voice is used, and whether it works offline, depends on the voices installed in Chrome and on the computer.
- Hover mode **stays off on pages with a password field**, so login forms are never touched.
- The enlarged look is only a temporary style. Nothing on the page is changed or deleted.

### Tested on

| Site | Enlarge | Read aloud |
|---|---|---|
| Wikipedia article | 👍 | 👍 |
| The Hindu | 👍 | 👍 |
| Times of India | 👍 | 👍 |

### Known limitations

- Very large links (full-width cards and banners) get a border but are not enlarged, and neither are links that wrap over several lines. This stops the page layout from jumping.
- The backup voice (the page's built-in speech) only works after you have clicked or typed on the page once. The main voice does not have this rule.
- Speech language depends on the voices installed in the browser or operating system.
- Settings such as on/off, voice speed and language are not in a popup yet.

### Third-party code
Focus view uses [Mozilla Readability](https://github.com/mozilla/readability)
(Apache License 2.0). Its license notice is kept at the top of the library files.
