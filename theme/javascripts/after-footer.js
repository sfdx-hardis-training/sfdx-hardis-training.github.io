/*
 * Nothing belongs after the footer.
 *
 * The theme swaps the page content in place rather than reloading, and a lab
 * was once seen with a leftover picture from the previous lab painted under
 * the footer, in a white band at the bottom of the page. The template never
 * puts anything after the footer, so anything found there is wreckage from a
 * swap that went wrong, and dropping it costs nothing.
 *
 * This runs on every page change, which is when a swap would have left it.
 */
(function () {
  "use strict";

  function sweep() {
    var footer = document.querySelector(".md-container > .md-footer, .md-container > footer");
    if (!footer) {
      return;
    }
    var stray = footer.nextElementSibling;
    while (stray) {
      var next = stray.nextElementSibling;
      stray.remove();
      stray = next;
    }
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(sweep);
  } else {
    document.addEventListener("DOMContentLoaded", sweep);
  }
})();
