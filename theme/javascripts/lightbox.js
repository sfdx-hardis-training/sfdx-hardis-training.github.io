/*
 * Full screen viewer for the screenshots.
 *
 * Nearly every step of every lab is a picture of a panel, and those pictures
 * carry text: a version number, a prompt, the name of a branch. Shrunk to the
 * width of the page column they are often too small to read, and the only way
 * to see one properly was to right-click and open it in a new tab.
 *
 * The theme already wraps each image in <a class="glightbox" href="the file">,
 * but it ships no viewer with it, so a click simply left the lab and landed on
 * a bare PNG. This is the viewer: the click opens the picture over the page at
 * its full size, and Escape, the close button or a click outside puts it back.
 *
 * It is written as a single delegated listener on the document, so it keeps
 * working after the theme swaps the page content in place on navigation, and
 * it needs no library.
 */
(function () {
  "use strict";

  var overlay = null;
  var image = null;
  var caption = null;
  var lastFocused = null;

  function build() {
    overlay = document.createElement("div");
    overlay.className = "sfh-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.hidden = true;

    var close = document.createElement("button");
    close.type = "button";
    close.className = "sfh-lightbox__close";
    close.setAttribute("aria-label", "Close the picture");
    close.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

    var figure = document.createElement("figure");
    figure.className = "sfh-lightbox__figure";
    image = document.createElement("img");
    image.className = "sfh-lightbox__image";
    caption = document.createElement("figcaption");
    caption.className = "sfh-lightbox__caption";
    figure.appendChild(image);
    figure.appendChild(caption);

    overlay.appendChild(close);
    overlay.appendChild(figure);
    document.body.appendChild(overlay);

    close.addEventListener("click", hide);
    overlay.addEventListener("click", function (event) {
      // a click on the picture itself keeps it open, anywhere else closes
      if (event.target !== image) {
        hide();
      }
    });
  }

  function show(src, alt) {
    if (!overlay) {
      build();
    }
    lastFocused = document.activeElement;
    image.src = src;
    image.alt = alt || "";
    caption.textContent = alt || "";
    caption.hidden = !alt;
    overlay.hidden = false;
    document.body.classList.add("sfh-lightbox-open");
    overlay.querySelector(".sfh-lightbox__close").focus();
  }

  function hide() {
    if (!overlay || overlay.hidden) {
      return;
    }
    overlay.hidden = true;
    image.removeAttribute("src");
    document.body.classList.remove("sfh-lightbox-open");
    if (lastFocused && lastFocused.focus) {
      lastFocused.focus();
    }
  }

  // Capture phase on purpose. The theme claims link clicks first, to swap the
  // page without reloading it, and by the time a listener on the way back up
  // runs the click has already been cancelled. Taking it on the way down keeps
  // the picture out of that machinery entirely.
  document.addEventListener(
    "click",
    function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }
      var picture = event.target.closest && event.target.closest(".md-typeset img");
      if (!picture) {
        return;
      }
      // an image the author made into a link of its own goes where it points
      var link = picture.closest("a");
      if (link && !link.classList.contains("glightbox")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      show(link ? link.getAttribute("href") : picture.currentSrc || picture.src, picture.getAttribute("alt"));
    },
    true
  );

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      hide();
    }
  });

  // the theme replaces the page content without reloading, so a picture left
  // open would survive the move to the next lab
  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(hide);
  }
})();
