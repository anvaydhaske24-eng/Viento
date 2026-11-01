(function () {
  // Avoid running the feature more than once
  if (window.vientoGistLoaded) return;
  window.vientoGistLoaded = true;

  // Important words we want to identify
  const importantWords = [
    "important",
    "important",
    "must",
    "should",
    "because",
    "therefore",
    "however",
    "first",
    "finally",
    "required",
    "warning",
    "result",
    "reason",
    "solution"
  ];

  // Create the button
  const button = document.createElement("button");
  button.textContent = "Highlight the Gist";
  button.id = "viento-gist-button";

  document.body.appendChild(button);

  // Highlight important words when clicked
  button.addEventListener("click", function () {
    const paragraphs = document.querySelectorAll("p");

    paragraphs.forEach(function (paragraph) {
      if (paragraph.closest("#viento-focus-host")) return;
      if (paragraph.dataset.vientoGistDone === "true") return;

      let html = paragraph.innerHTML;

      importantWords.forEach(function (word) {
        const regex = new RegExp("\\b(" + word + ")\\b", "gi");

        html = html.replace(
          regex,
          '<span class="viento-gist-highlight">$1</span>'
        );
      });

      paragraph.innerHTML = html;
      paragraph.dataset.vientoGistDone = "true";
    });
  });
})();