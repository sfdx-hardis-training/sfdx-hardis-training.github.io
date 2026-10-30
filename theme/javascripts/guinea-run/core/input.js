/*
 * Every way to play, turned into the same few actions: left, right, jump, duck,
 * confirm, pause, mute and quit.
 *
 * Keys are read by position (event.code), so WASD works on every layout: on an
 * AZERTY keyboard the same keys are ZQSD. The arrows work as well, for those
 * who have them. On a touch screen a swipe moves and a tap jumps, and the pads
 * at the bottom of the screen do the same for those who prefer tapping.
 *
 * The bonus table plays with held keys instead (options.hold): a flipper is
 * up while its key is down. Shift, the arrows, A and D (Q and D on AZERTY)
 * are the flippers, Space and Down the plunger, Up and W (Z on AZERTY) the
 * nudge. On a touch screen each half of the screen is a flipper, several
 * fingers at once, and a quick swipe up nudges.
 *
 * The maze of Org-Man (options.swipeOnMove) turns while the finger moves,
 * so a turn is not late by the time it takes to lift it.
 *
 * Buttons of the menus are real buttons: a click, or Enter or Space while one
 * has the focus, presses it. The pads react on pointerdown, so a press counts
 * at once instead of when the finger lifts.
 */

const KEYMAP = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump",
  ArrowDown: "duck",
  KeyS: "duck",
  KeyP: "pause",
  KeyM: "mute",
  Escape: "quit",
  Enter: "confirm",
  NumpadEnter: "confirm"
};

// The held keys of the bonus table
const HOLD_KEYS = {
  ShiftLeft: "left",
  ArrowLeft: "left",
  KeyA: "left",
  ShiftRight: "right",
  ArrowRight: "right",
  KeyD: "right",
  Space: "plunger",
  ArrowDown: "plunger",
  KeyS: "plunger",
  ArrowUp: "nudge",
  KeyW: "nudge"
};
const NUDGE_SWIPE_PX = 45;
const NUDGE_SWIPE_MS = 260;

const SWIPE_MIN_PX = 30;
const TAP_MAX_PX = 12;
const TAP_MAX_MS = 250;

function isControl(element) {
  if (!element || !element.tagName) {
    return false;
  }
  const tag = element.tagName.toLowerCase();
  return tag === "button" || tag === "a" || tag === "input" || tag === "select" || tag === "textarea";
}

function isTyping(element) {
  if (!element || !element.tagName) {
    return false;
  }
  const tag = element.tagName.toLowerCase();
  return tag === "textarea" || (tag === "input" && !["checkbox", "radio", "button", "submit"].includes(element.type));
}

/**
 * Listens on the overlay and the window and calls onAction(name, element) for
 * every action. options.hold(): whether held keys are wanted now; then
 * options.onHold(name, down) gets them instead. Returns a function that
 * removes every listener.
 */
export function createInput(overlay, canvas, onAction, options = {}) {
  const cleanups = [];

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  const holding = () => Boolean(options.hold && options.hold());
  // Each finger on the table: its pointer id, the flipper it holds, where and when it went down
  const fingers = new Map();

  function releaseAll() {
    for (const finger of fingers.values()) {
      options.onHold(finger.side, false);
    }
    fingers.clear();
  }

  listen(
    window,
    "keydown",
    (event) => {
      if (holding() && HOLD_KEYS[event.code] && !(isTyping(document.activeElement) && overlay.contains(document.activeElement))) {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) {
          options.onHold(HOLD_KEYS[event.code], true);
        }
        return;
      }
      const action = KEYMAP[event.code];
      if (!action) {
        return;
      }
      // A focused menu button takes Enter and Space itself, as any button does
      const focused = document.activeElement;
      // A text box takes every key but Escape: WASD are letters of a GitHub handle
      if (action !== "quit" && isTyping(focused) && overlay.contains(focused)) {
        event.stopPropagation();
        return;
      }
      if ((event.code === "Enter" || event.code === "Space" || event.code === "NumpadEnter") && isControl(focused) && overlay.contains(focused)) {
        event.stopPropagation();
        return;
      }
      // Arrows and Space would scroll the page behind the game
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat && action !== "duck" && action !== "left" && action !== "right") {
        return;
      }
      onAction(action, null);
    },
    { capture: true }
  );

  listen(
    window,
    "keyup",
    (event) => {
      if (holding() && HOLD_KEYS[event.code]) {
        event.preventDefault();
        options.onHold(HOLD_KEYS[event.code], false);
      }
    },
    { capture: true }
  );

  // The bonus table: each half of the screen is a flipper
  listen(overlay, "pointerdown", (event) => {
    if (!holding() || (event.target.closest && event.target.closest("button, a, input, .gr-panel, .gr-corner"))) {
      return;
    }
    event.preventDefault();
    const box = overlay.getBoundingClientRect();
    const side = event.clientX - box.left < box.width / 2 ? "left" : "right";
    fingers.set(event.pointerId, { side, x: event.clientX, y: event.clientY, time: performance.now(), nudged: false });
    options.onHold(side, true);
  });
  listen(overlay, "pointermove", (event) => {
    const finger = fingers.get(event.pointerId);
    if (!finger || finger.nudged) {
      return;
    }
    if (finger.y - event.clientY > NUDGE_SWIPE_PX && performance.now() - finger.time < NUDGE_SWIPE_MS) {
      finger.nudged = true;
      options.onHold("nudge", true);
    }
  });
  for (const type of ["pointerup", "pointercancel"]) {
    listen(overlay, type, (event) => {
      const finger = fingers.get(event.pointerId);
      if (finger) {
        fingers.delete(event.pointerId);
        options.onHold(finger.side, false);
      }
    });
  }
  listen(window, "blur", () => {
    if (fingers.size) {
      releaseAll();
    }
  });

  // Swipes and taps on the canvas
  let start = null;
  listen(canvas, "pointerdown", (event) => {
    if (holding()) {
      return;
    }
    // A world with a single jump pad has no swipe to tell apart: its tap counts
    // at the touch, as fast as the pad
    if (options.tapOnDown && options.tapOnDown()) {
      start = null;
      onAction("tap", null);
      return;
    }
    start = { x: event.clientX, y: event.clientY, time: performance.now(), id: event.pointerId };
  });
  // A maze turns as soon as the finger has moved far enough, and the same
  // finger may go on to the next turn without lifting (options.swipeOnMove)
  listen(canvas, "pointermove", (event) => {
    if (!start || start.id !== event.pointerId || !(options.swipeOnMove && options.swipeOnMove())) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) {
      return;
    }
    start = { x: event.clientX, y: event.clientY, time: performance.now(), id: event.pointerId, swiped: true };
    if (Math.abs(dx) > Math.abs(dy)) {
      onAction(dx < 0 ? "left" : "right", null);
    } else {
      onAction(dy < 0 ? "jump" : "duck", null);
    }
  });
  listen(canvas, "pointerup", (event) => {
    if (!start || start.id !== event.pointerId) {
      return;
    }
    if (start.swiped) {
      start = null;
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = performance.now() - start.time;
    start = null;
    if (Math.abs(dx) < TAP_MAX_PX && Math.abs(dy) < TAP_MAX_PX && elapsed < TAP_MAX_MS) {
      onAction("tap", null);
      return;
    }
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) {
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      onAction(dx < 0 ? "left" : "right", null);
    } else {
      onAction(dy < 0 ? "jump" : "duck", null);
    }
  });
  listen(canvas, "pointercancel", () => {
    start = null;
  });

  // The pads, at once on pointerdown
  listen(overlay, "pointerdown", (event) => {
    const pad = event.target.closest ? event.target.closest("[data-pad]") : null;
    if (!pad || !overlay.contains(pad)) {
      return;
    }
    event.preventDefault();
    onAction(pad.getAttribute("data-pad"), pad);
  });

  // Every other button, on click, which a keyboard press also fires
  listen(overlay, "click", (event) => {
    const button = event.target.closest ? event.target.closest("[data-action]") : null;
    if (!button || !overlay.contains(button) || button.hasAttribute("data-pad")) {
      return;
    }
    event.preventDefault();
    onAction(button.getAttribute("data-action"), button);
  });

  return function dispose() {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
