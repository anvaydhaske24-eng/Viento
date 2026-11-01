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

### Third-party code

Focus view uses [Mozilla Readability](https://github.com/mozilla/readability)
(Apache License 2.0). Its license notice is kept at the top of the library files.
