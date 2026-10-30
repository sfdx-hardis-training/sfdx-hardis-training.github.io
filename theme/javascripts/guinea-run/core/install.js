/**
 * The offer to add Guinea Run to the home screen, where it plays offline
 * (play.html, its manifest and sw.js). No DOM here: tested in Node by
 * scripts/guinea-run/install.test.mjs.
 *
 * install is options.install of the game:
 * - undefined on a course page: the offer opens the game page (kind "page");
 * - null in a frame or in the home screen app: no offer at all;
 * - { canPrompt(), installed(), prompt() } on the game page (play.html): the
 *   browser's own install button when it has one waiting (Android, kind
 *   "prompt"), otherwise the Safari steps on an iPhone or an iPad (kind
 *   "ios"), the menu entry elsewhere (kind "menu"), which is also what a
 *   player who dismissed the browser's install box sees until the browser
 *   offers it again.
 *
 * The offer goes away only when the game is surely installed: play.html says
 * so (appinstalled, the app itself, getInstalledRelatedApps), and remembers it
 * under INSTALLED_KEY, which a course page reads too.
 */

/** The key play.html writes once the game is surely installed on this device. */
export const INSTALLED_KEY = "guinea-run-installed";

/**
 * device: { touch, testMode, userAgent, platform, maxTouchPoints, remembered }
 * (remembered: INSTALLED_KEY is set). Returns null or { kind }.
 */
export function installKind(install, device) {
  if (install === null || !device.touch || device.testMode) {
    return null;
  }
  if (install === undefined) {
    return device.remembered ? null : { kind: "page" };
  }
  if (install.installed()) {
    return null;
  }
  if (install.canPrompt()) {
    return { kind: "prompt" };
  }
  return { kind: isApple(device) ? "ios" : "menu" };
}

/**
 * What play.html knows about the install, given to the game as options.install.
 * isApp: the page runs as the home screen app. notify(): called at each change,
 * so the game redraws its offers.
 *
 * Only a sure signal hides the offer for good and is remembered: the
 * appinstalled event (installedNow), the app itself, or getInstalledRelatedApps
 * listing the game (relatedApps). An "accepted" answer to the browser's box
 * hides it for this visit only: the install can still fail, and the next visit
 * offers it again unless a sure signal came. A "dismissed" answer keeps an
 * offer: the browser's box cannot open twice, so the menu entry shows until the
 * browser offers its box again (promptArrived).
 */
export function createInstallOffer({ storage, isApp, notify }) {
  let waiting = null;
  let accepted = false;
  let installed = Boolean(isApp) || rememberedInstalled(storage);
  if (isApp) {
    remember(storage);
  }
  const changed = () => {
    if (notify) {
      notify();
    }
  };
  return {
    canPrompt: () => Boolean(waiting),
    installed: () => installed || accepted,
    /** beforeinstallprompt, already preventDefault-ed. */
    promptArrived(event) {
      waiting = event;
      changed();
    },
    /** appinstalled. */
    installedNow() {
      installed = true;
      waiting = null;
      remember(storage);
      changed();
    },
    /**
     * What getInstalledRelatedApps() answered, where the browser has it. Only
     * a listed game counts: an empty list is no proof (Chrome answers it on a
     * computer, on a local copy, and wherever it cannot match the manifest), so
     * it never brings back an offer that a sure signal hid.
     */
    relatedApps(list) {
      if (list && list.length) {
        this.installedNow();
      }
    },
    /** Opens the browser's box. Resolves to "accepted", "dismissed", "failed" or "none". */
    async prompt() {
      const event = waiting;
      waiting = null;
      if (!event) {
        return "none";
      }
      let outcome = "failed";
      try {
        await event.prompt();
        const choice = await event.userChoice;
        outcome = choice && choice.outcome === "accepted" ? "accepted" : "dismissed";
      } catch {
        // The browser refused to open its box: the menu entry is still there
      }
      if (outcome === "accepted") {
        accepted = true;
      }
      changed();
      return outcome;
    }
  };
}

/** True when this browser remembers the game as installed. Never throws (private windows, blocked storage). */
export function rememberedInstalled(storage) {
  try {
    return Boolean(storage && storage.getItem(INSTALLED_KEY));
  } catch {
    return false;
  }
}

function remember(storage) {
  try {
    storage.setItem(INSTALLED_KEY, "1");
  } catch {
    // Nothing kept: the offer may show again at the next visit
  }
}

function isApple(device) {
  return /iPhone|iPad|iPod/.test(device.userAgent || "") || (device.platform === "MacIntel" && device.maxTouchPoints > 1);
}
