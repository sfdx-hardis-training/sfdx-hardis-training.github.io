/*
 * Opens Guinea Run, the small game hidden in the course.
 *
 * Two ways in, so every keyboard and every phone can find it:
 * - the Konami code: up up down down left right left right B A. Each arrow can
 *   also be typed on the WASD keys, read by position, so a keyboard without
 *   arrows works too, and an AZERTY one types it on ZQSD without any setting.
 * - five taps within three seconds on the guinea pig of the footer, which is
 *   the way in on a phone. See site-overrides/partials/footer.html.
 *
 * This file runs on every page, so it only listens. The game itself, its
 * stylesheet and Three.js load the first time a trigger fires, from
 * guinea-run/game.js next to this file.
 *
 * Checked by scripts/verify/check-easter-egg.mjs.
 */
(function () {
  "use strict";

  // Where this script was served from, so the game loads from the same folder
  // whatever page and language the reader is on.
  var current = document.currentScript;
  var BASE = current && current.src ? current.src.replace(/[^/]*$/, "") : "";

  var SEQUENCE = [
    ["ArrowUp", "KeyW"],
    ["ArrowUp", "KeyW"],
    ["ArrowDown", "KeyS"],
    ["ArrowDown", "KeyS"],
    ["ArrowLeft", "KeyA"],
    ["ArrowRight", "KeyD"],
    ["ArrowLeft", "KeyA"],
    ["ArrowRight", "KeyD"],
    ["KeyB", "b"],
    ["KeyA", "a"]
  ];
  var TAPS_NEEDED = 5;
  var TAP_WINDOW_MS = 3000;

  var position = 0;
  var usedLetters = false;
  var taps = [];
  var running = null;

  function pageLanguage() {
    var menu = document.querySelector(".md-nav--primary[data-course-lang]");
    var lang = (menu && menu.getAttribute("data-course-lang")) || document.documentElement.lang || "en";
    return lang.toLowerCase().indexOf("fr") === 0 ? "fr" : "en";
  }

  function isTyping(target) {
    if (!target || !target.tagName) {
      return false;
    }
    var tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
  }

  function matches(step, event) {
    var key = (event.key || "").toLowerCase();
    return step.indexOf(event.code) !== -1 || step.indexOf(key) !== -1;
  }

  function onKey(event) {
    if (running || isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (matches(SEQUENCE[position], event)) {
      if (/^Key[WASD]$/.test(event.code) && position < 8) {
        usedLetters = true;
      }
      position += 1;
      if (position === SEQUENCE.length) {
        var trigger = usedLetters ? "konami_wasd" : "konami";
        position = 0;
        usedLetters = false;
        open(trigger);
      }
      return;
    }
    // A wrong key may still be the start of a new attempt
    position = matches(SEQUENCE[0], event) ? 1 : 0;
    usedLetters = position === 1 && /^Key[W]$/.test(event.code);
  }

  function onClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-guinea-egg]") : null;
    if (!target || running) {
      return;
    }
    var now = Date.now();
    taps = taps.filter(function (time) {
      return now - time < TAP_WINDOW_MS;
    });
    taps.push(now);
    target.classList.remove("guinea-egg--tap");
    // Restart the little hop on every tap
    void target.offsetWidth;
    target.classList.add("guinea-egg--tap");
    if (taps.length >= TAPS_NEEDED) {
      taps = [];
      open("footer");
    }
  }

  // The theme never defines window.gtag: it pushes into dataLayer from a
  // function of its own (extra.analytics in course-site.yml). This pushes the
  // same way, as an arguments object, which is what gtag.js reads. With no
  // analytics configured there is no dataLayer and nothing is sent.
  function gtag() {
    window.dataLayer.push(arguments);
  }

  function track(name, params) {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", name, params);
      } else if (Array.isArray(window.dataLayer)) {
        gtag("event", name, params);
      }
    } catch {
      // Analytics never stops the game
    }
  }

  function open(trigger) {
    var lang = pageLanguage();
    track("easter_egg_found", { trigger: trigger });
    running = import(BASE + "guinea-run/game.js")
      .then(function (game) {
        return game.start({
          lang: lang,
          trigger: trigger,
          base: BASE + "guinea-run/",
          track: track,
          onExit: function () {
            running = null;
          }
        });
      })
      .catch(function () {
        running = null;
        var message =
          lang === "fr"
            ? "Le jeu n'a pas pu se charger. Vérifiez votre connexion et réessayez."
            : "The game could not load. Check your connection and try again.";
        window.alert(message);
      });
  }

  // A page change under an open game closes it: the theme swaps the page in
  // place, and the game would otherwise keep running over a page nobody sees.
  function onPageChange() {
    if (running) {
      running.then(function (game) {
        if (game && game.stop) {
          game.stop();
        }
      });
    }
  }

  document.addEventListener("keydown", onKey);
  document.addEventListener("click", onClick);
  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(onPageChange);
  }
})();
