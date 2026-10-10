/*
 * Keeps the language picker pointing at the page being read, and remembers the
 * language the reader picks.
 *
 * site-overrides/partials/alternate.html writes the right links into the picker
 * when a page is served. But the theme navigates without reloading, and what it
 * swaps is the container, the logo and the header title, never the rest of the
 * header. So the picker keeps the links of the page the reader first landed on:
 * open the home page, walk to Lab 2.2 through the menu, click Français, and you
 * are back on the French home page instead of on Lab 2.2 in French.
 *
 * This rebuilds the links on every page change, from where each page says it is
 * read in the other languages. The menu carries that, because the menu is
 * inside what the theme swaps: see site-overrides/partials/nav.html. A page
 * with no counterpart in a language falls back to the home page of that
 * language, which each link carries in data-course-home.
 *
 * Picking a language also writes it in a cookie, so the next visit opens in it:
 * the redirect that reads the cookie runs in the head, before the page is
 * painted, and lives in site-overrides/main.html.
 *
 * Checked by scripts/verify/check-language-switch.mjs, which walks to a lab
 * through the menu before clicking, because a page opened directly has the
 * right links either way.
 */
(function () {
  "use strict";

  var COOKIE = "course-language";
  var YEAR = 60 * 60 * 24 * 365;

  /** Where the site is published, as an absolute path ending in a slash. */
  function siteBase(menu) {
    var base = new URL(menu.getAttribute("data-course-base") || ".", window.location.href).pathname;
    return base.slice(-1) === "/" ? base : base + "/";
  }

  function menuElement() {
    return document.querySelector(".md-nav--primary[data-course-lang]");
  }

  function retarget() {
    var links = document.querySelectorAll("a.md-select__link[hreflang]");
    if (links.length === 0) {
      return;
    }
    var menu = menuElement();
    if (!menu) {
      return;
    }
    var base = siteBase(menu);
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var lang = link.getAttribute("hreflang");
      var target = menu.getAttribute("data-course-alt-" + lang);
      var home = link.getAttribute("data-course-home");
      if (!lang) {
        continue;
      }
      if (target) {
        link.setAttribute("href", base + target);
      } else if (home) {
        // No counterpart in that language: its home page, rather than nowhere
        link.setAttribute("href", home);
      }
    }
  }

  /**
   * The language the reader just picked, for the next visit.
   *
   * Scoped to the path the course is published under, so it says nothing to the
   * other sites of the same domain, and lax so it survives arriving from a link
   * somebody shared.
   */
  function remember(lang) {
    var menu = menuElement();
    if (!menu || !lang) {
      return;
    }
    try {
      document.cookie =
        COOKIE + "=" + encodeURIComponent(lang) + "; path=" + siteBase(menu) + "; max-age=" + YEAR + "; samesite=lax";
    } catch (error) {
      // A browser refusing cookies loses the preference, and nothing else
    }
  }

  // Capture, so the choice is written before the theme navigates away
  document.addEventListener(
    "click",
    function (event) {
      var link = event.target.closest && event.target.closest("a.md-select__link[hreflang]");
      if (link) {
        remember(link.getAttribute("hreflang"));
      }
    },
    true
  );

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(retarget);
  } else {
    document.addEventListener("DOMContentLoaded", retarget);
  }
})();
