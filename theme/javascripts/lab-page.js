/*
 * What a lab page adds on top of its markdown: numbered captions under the
 * screenshots, and ticks the learner can set as they go.
 *
 * Captions. Every screenshot of a lab already has an alt text that says what it
 * shows. A screenshot standing in its own paragraph becomes a figure, captioned
 * "Figure N · <alt>", numbered down the page, so a sentence and a picture can
 * point at each other.
 *
 * Ticks. Three kinds, all saved in this browser only (localStorage), per page:
 *   - the task lists of the markdown ("- [ ]"), Before you start and What you
 *     should see among them
 *   - a table cell holding exactly "[ ]", a row of stories to merge one by one
 *   - a "Done" box added to each "You should now see" block, which also puts a
 *     tick next to the step in the table of contents
 * Storage can be missing (a private window, blocked site data): every read and
 * write is guarded, and the page works the same without it.
 */
(function () {
  var WORDS = {
    en: { figure: "Figure", done: "Done", enlarge: "click to enlarge" },
    fr: { figure: "Figure", done: "Terminé", enlarge: "cliquer pour agrandir" }
  };

  function words() {
    var lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2);
    return WORDS[lang] || WORDS.en;
  }

  function storageKey() {
    return "sfh-lab:" + location.pathname;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) || {} : {};
    } catch (error) {
      return {};
    }
  }

  function save(state) {
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(state));
    } catch (error) {
      // no storage: the tick holds until the page is left, which is all it can do
    }
  }

  function captionFigures(article) {
    var count = 0;
    var label = words().figure;
    article.querySelectorAll("p > a.glightbox > img, p > img").forEach(function (image) {
      var holder = image.parentElement.tagName === "A" ? image.parentElement : image;
      var paragraph = holder.parentElement;
      // only a picture alone in its paragraph: an inline icon is not a figure
      if (!paragraph || paragraph.tagName !== "P" || paragraph.children.length !== 1 || paragraph.textContent.trim() !== "") {
        return;
      }
      if (paragraph.closest(".lab-meta, .admonition-title, .lab-figure") || image.className) {
        return;
      }
      var alt = (image.getAttribute("alt") || "").trim();
      if (!alt) {
        return;
      }
      count += 1;
      var figure = document.createElement("figure");
      figure.className = "lab-figure";
      var caption = document.createElement("figcaption");
      var number = document.createElement("b");
      number.textContent = label + " " + count;
      caption.appendChild(number);
      caption.appendChild(document.createTextNode(" · " + alt));
      if (holder.tagName === "A") {
        // the screenshot is shown small: say it opens full size, and let the words open it too
        var zoom = document.createElement("span");
        zoom.className = "lab-figure-zoom";
        zoom.textContent = "(" + words().enlarge + ")";
        zoom.addEventListener("click", function () {
          image.click();
        });
        caption.appendChild(zoom);
      }
      paragraph.parentNode.replaceChild(figure, paragraph);
      figure.appendChild(holder);
      figure.appendChild(caption);
    });
  }

  /** The id of the step heading a node sits under, or null outside a step. */
  function stepIdOf(node) {
    var walker = node;
    while (walker) {
      var previous = walker.previousElementSibling;
      while (previous) {
        if (previous.tagName === "H3" && previous.id) {
          return previous.id;
        }
        if (previous.tagName === "H2") {
          return null;
        }
        previous = previous.previousElementSibling;
      }
      walker = walker.parentElement;
      if (!walker || walker.tagName === "ARTICLE") {
        return null;
      }
    }
    return null;
  }

  function markToc(stepId, done) {
    // The theme rewrites the table of contents links to full addresses: match the end
    document.querySelectorAll('.md-nav__link[href$="#' + stepId + '"]').forEach(function (link) {
      link.classList.toggle("lab-step-is-done", done);
    });
  }

  function bind(input, key, state, onChange) {
    input.checked = state[key] === true;
    input.addEventListener("change", function () {
      state[key] = input.checked;
      save(state);
      if (onChange) {
        onChange(input.checked);
      }
    });
  }

  function addTicks(article) {
    var state = load();
    var text = words();

    article.querySelectorAll(".task-list-item input[type='checkbox']").forEach(function (input, index) {
      input.disabled = false;
      input.removeAttribute("disabled");
      bind(input, "task-" + index, state);
    });

    var cells = 0;
    article.querySelectorAll("td").forEach(function (cell) {
      if (cell.textContent.trim() !== "[ ]") {
        return;
      }
      var input = document.createElement("input");
      input.type = "checkbox";
      input.className = "lab-tick";
      var row = cell.parentElement;
      input.setAttribute("aria-label", row ? row.textContent.replace("[ ]", "").trim() : "");
      cell.textContent = "";
      cell.appendChild(input);
      bind(input, "cell-" + cells, state);
      cells += 1;
    });

    article.querySelectorAll(".blk-check").forEach(function (block) {
      var stepId = stepIdOf(block);
      if (!stepId) {
        return;
      }
      var label = document.createElement("label");
      label.className = "lab-step-done";
      var input = document.createElement("input");
      input.type = "checkbox";
      input.className = "lab-tick";
      label.appendChild(input);
      label.appendChild(document.createTextNode(text.done));
      block.appendChild(label);
      bind(input, "step-" + stepId, state, function (done) {
        markToc(stepId, done);
      });
      markToc(stepId, input.checked);
    });
  }

  function setUp() {
    var article = document.querySelector("article.md-content__inner");
    // lab pages only: the three lines at the top of a lab are what tells one apart
    if (!article || !article.querySelector(".lab-meta")) {
      return;
    }
    captionFigures(article);
    addTicks(article);
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(setUp);
  } else {
    document.addEventListener("DOMContentLoaded", setUp);
  }
})();
