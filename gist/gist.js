(function () {
  "use strict";

  if (window.__vientoGistLoaded) return;
  window.__vientoGistLoaded = true;

  const BUTTON_ID = "viento-gist-button";
  const MARK_CLASS = "viento-gist-highlight";

  // ----------------------------------
  // 1. Split text into sentences
  // ----------------------------------

  function getSentences(text) {
    if (window.Intl && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("en", {
        granularity: "sentence"
      });

      return Array.from(segmenter.segment(text), item => ({
        text: item.segment,
        start: item.index,
        end: item.index + item.segment.length
      })).filter(item => item.text.trim().length > 25);
    }

    const result = [];
    const regex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      result.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return result.filter(item => item.text.trim().length > 25);
  }

  // ----------------------------------
  // 2. Score sentence importance
  // ----------------------------------

  function scoreSentence(sentence, index, total, wordFrequency) {
    const text = sentence.toLowerCase();
    let score = 0;

    const patterns = [
      /in conclusion|to conclude|in summary|overall/,
      /as a result|therefore|consequently/,
      /the main reason|the main cause|the main purpose/,
      /is defined as|refers to|is known as|is called/,
      /one major advantage|major disadvantage/,
      /an important|the key|the most important/,
      /for example|for instance/,
      /leads to|results in|causes/,
      /problem|solution|risk|benefit/,
      /must|should|required|essential/,
      /founded|created|developed|established/
    ];

    patterns.forEach(pattern => {
      if (pattern.test(text)) score += 2;
    });

    // Numbers, percentages and dates
    if (/\d+%|\d+\.\d+|\d{2,}/.test(text)) {
      score += 1.5;
    }

    // Explanation and contrast
    if (/however|although|because|but|whereas|since/.test(text)) {
      score += 1;
    }

    // Repeated topic words
    const words = text.match(/\b[a-z]{4,}\b/g) || [];
    let repeated = 0;

    words.forEach(word => {
      if (wordFrequency[word] >= 3 && repeated < 3) {
        score += 0.5;
        repeated++;
      }
    });

    // First and last sentences
    if (index === 0 || index === total - 1) {
      score += 0.8;
    }

    // Useful sentence length
    if (text.length >= 60 && text.length <= 250) {
      score += 0.5;
    }

    if (text.length > 350) {
      score -= 1;
    }

    return score;
  }

  // ----------------------------------
  // 3. Check hidden paragraphs
  // ----------------------------------

  function isHidden(element) {
    let current = element;

    while (current && current.nodeType === 1) {
      if (
        current.hidden ||
        current.classList.contains("viento-hidden")
      ) {
        return true;
      }

      const view = current.ownerDocument.defaultView;

      if (view) {
        const style = view.getComputedStyle(current);

        if (
          style.display === "none" ||
          style.visibility === "hidden"
        ) {
          return true;
        }
      }

      current = current.parentElement;
    }

    return false;
  }

  // ----------------------------------
  // 4. Find article paragraphs
  // ----------------------------------

  function getArticleParagraphs() {
    // Prefer Wikipedia's actual article content
    const wikipediaParagraphs = document.querySelectorAll(
      "#mw-content-text .mw-parser-output p"
    );

    // Use Wikipedia paragraphs when available.
    // Otherwise, search the whole webpage.
    const paragraphs = wikipediaParagraphs.length
      ? Array.from(wikipediaParagraphs)
      : Array.from(document.querySelectorAll("p"));

    return paragraphs.filter(p => {
      const text = p.textContent.trim();

      return (
        text.length > 80 &&
        !isHidden(p) &&
        !p.closest(
          "nav, footer, header, aside, form, button, " +
          "[role='navigation'], .toc, .navbox, " +
          "#viento-focus-host"
        ) &&
        !p.querySelector(
          "button, input, textarea, select, " +
          "code, script, style, iframe"
        )
      );
    });
  }

  // ----------------------------------
  // 5. Remove existing highlights
  // ----------------------------------

  function removeHighlights() {
    document.querySelectorAll(
      "mark." + MARK_CLASS
    ).forEach(mark => {
      mark.replaceWith(...Array.from(mark.childNodes));
    });

    document.querySelectorAll("p").forEach(p => {
      p.normalize();
    });
  }

  // ----------------------------------
  // 6. Highlight a sentence
  // ----------------------------------

  function highlightSentence(element, start, end) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];
    let node;
    let position = 0;

    while ((node = walker.nextNode())) {
      const length = node.textContent.length;

      nodes.push({
        node: node,
        start: position,
        end: position + length
      });

      position += length;
    }

    const first = nodes.find(item =>
      item.start <= start && item.end > start
    );

    const last = nodes.find(item =>
      item.start < end && item.end >= end
    );

    if (!first || !last) return;

    const range = document.createRange();

    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);

    const mark = document.createElement("mark");
    mark.className = MARK_CLASS;

    mark.appendChild(range.extractContents());
    range.insertNode(mark);
  }

  // ----------------------------------
  // 7. Main Gist highlighting function
  // ----------------------------------

  function highlightGist(button) {
    removeHighlights();

    const paragraphs = getArticleParagraphs();
    const allSentences = [];
    const wordFrequency = {};

    // Count repeated words across the article
    paragraphs.forEach(p => {
      const words = p.textContent.toLowerCase()
        .match(/\b[a-z]{4,}\b/g) || [];

      words.forEach(word => {
        wordFrequency[word] =
          (wordFrequency[word] || 0) + 1;
      });
    });

    // Score each sentence
    paragraphs.forEach(p => {
      const sentences = getSentences(p.textContent);

      sentences.forEach((sentence, index) => {
        allSentences.push({
          paragraph: p,
          ...sentence,
          score: scoreSentence(
            sentence.text,
            index,
            sentences.length,
            wordFrequency
          )
        });
      });
    });

    if (allSentences.length === 0) {
      alert("No suitable article paragraphs found.");
      return;
    }

    // Rank sentences
    const ranked = [...allSentences].sort(
      (a, b) => b.score - a.score
    );

    const targetCount = Math.min(
      12,
      Math.max(1, Math.ceil(allSentences.length * 0.18))
    );

    const selected = ranked
      .filter(item => item.score > 0.7)
      .slice(0, targetCount);

    if (selected.length === 0) {
      alert("No important sentences detected.");
      return;
    }

    // Group selected sentences by paragraph
    const grouped = new Map();

    selected.forEach(item => {
      if (!grouped.has(item.paragraph)) {
        grouped.set(item.paragraph, []);
      }

      grouped.get(item.paragraph).push(item);
    });

    // Process from end to beginning to preserve text positions
    grouped.forEach((items, paragraph) => {
      items.sort((a, b) => b.start - a.start);

      items.forEach(item => {
        highlightSentence(
          paragraph,
          item.start,
          item.end
        );
      });
    });

    button.textContent = "Remove Highlights";
    button.dataset.active = "true";
  }

  // ----------------------------------
  // 8. Create the Gist button
  // ----------------------------------

  function addGistButton() {
    if (!document.body) return;

    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement("button");

    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Highlight the Gist";
    button.dataset.active = "false";

    button.addEventListener("click", function () {
      if (button.dataset.active === "true") {
        removeHighlights();

        button.textContent = "Highlight the Gist";
        button.dataset.active = "false";
      } else {
        highlightGist(button);
      }
    });

    document.body.appendChild(button);
  }

  // ----------------------------------
  // 9. Initialize on every supported page
  // ----------------------------------

  function initializeGist() {
    addGistButton();
  }

  function startGist() {
    initializeGist();

    // Restore the button if a website removes it
    const observer = new MutationObserver(() => {
      if (!document.getElementById(BUTTON_ID)) {
        addGistButton();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startGist,
      { once: true }
    );
  } else {
    startGist();
  }

  console.log("Viento Gist successfully loaded.");

})();
