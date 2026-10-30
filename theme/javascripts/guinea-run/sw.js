/*
 * Guinea Run offline: a service worker that keeps a copy of the whole game, so
 * play.html (the game alone, also framed by the VS Code panel) plays without a
 * network once it has been opened online.
 *
 * play.html registers it once the game is ready. On install it saves every
 * file of FILES and Three.js, all or nothing: a file that fails drops the
 * install, tried again at the next visit. It never takes over a page already
 * open: a new version waits until every game page is closed, so a game in
 * progress never mixes two versions. Then it deletes the older copies.
 *
 * VERSION and FILES are written by scripts/build/site.mjs (a hash of the files,
 * and their paths from this folder). A copy that was never built ("dev") saves
 * nothing and serves nothing.
 *
 * The Hall of Fame board, GitHub, analytics and anything else stay on the
 * network: only the site's own files and the pinned Three.js are served here.
 */

const VERSION = "bec3aaa02c892666";
const FILES = [
  "core/checkpoint.js",
  "core/dev.js",
  "core/engine.js",
  "core/faces.js",
  "core/fx.js",
  "core/hof.js",
  "core/host-save.js",
  "core/input.js",
  "core/install.js",
  "core/models.js",
  "core/music.js",
  "core/painter.js",
  "core/progress.js",
  "core/quality.js",
  "core/random.js",
  "core/save-signal.js",
  "core/sound.js",
  "core/story.js",
  "core/tally.js",
  "core/themes.js",
  "credits.js",
  "game.js",
  "guinea-pig.js",
  "guinea-run.css",
  "hud.js",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "labs.js",
  "manifest.webmanifest",
  "models/data-cloud.glb",
  "models/guinea-pig.glb",
  "models/nature.glb",
  "models/office.glb",
  "models/platform.glb",
  "models/salesforce.glb",
  "models/vegetables.glb",
  "play.html",
  "sounds/annoyed.mp3",
  "sounds/chirp.mp3",
  "sounds/happy.mp3",
  "sounds/hungry.mp3",
  "sounds/scared.mp3",
  "sounds/wheek-1.mp3",
  "sounds/wheek-11.mp3",
  "sounds/wheek-12.mp3",
  "sounds/wheek-2.mp3",
  "sounds/wheek-3.mp3",
  "sounds/wheek-4.mp3",
  "sounds/wheek-5.mp3",
  "sounds/wheek-7.mp3",
  "texts.js",
  "vendor/BloomNode.js",
  "vendor/BufferGeometryUtils.js",
  "vendor/GLTFLoader.js",
  "vendor/SkeletonUtils.js",
  "worlds/musical.js",
  "worlds/orgman/autoplay.js",
  "worlds/orgman/ghosts.js",
  "worlds/orgman/index.js",
  "worlds/orgman/maze.js",
  "worlds/orgman/rules.js",
  "worlds/orgman/sim.js",
  "worlds/orgman/view.js",
  "worlds/pinball/art.js",
  "worlds/pinball/autoplay.js",
  "worlds/pinball/ball.js",
  "worlds/pinball/dmd.js",
  "worlds/pinball/index.js",
  "worlds/pinball/layout.js",
  "worlds/pinball/missions.js",
  "worlds/pinball/physics.js",
  "worlds/pinball/rules.js",
  "worlds/pinball/view.js",
  "worlds/runner.js",
  "worlds/world-0-setup.js",
  "worlds/world-1-org.js",
  "worlds/world-2-commit.js",
  "worlds/world-3-pull-request.js",
  "worlds/world-4-checks.js",
  "worlds/world-5-conflict.js",
  "worlds/world-6-integration.js",
  "worlds/world-7-promotion.js",
  "worlds/world-8-production.js",
  "worlds/world-9-monitoring.js",
  "../../images/guinea-pig.webp",
  "../../images/guinea-pig-small.webp",
  "../../images/mariia.svg",
  "../../images/romain.svg",
  "../../images/cloudity-text-logo-white.svg",
  "../../images/bosses/boss-1.svg",
  "../../images/bosses/boss-10.svg",
  "../../images/bosses/boss-11.svg",
  "../../images/bosses/boss-12.svg",
  "../../images/bosses/boss-13.svg",
  "../../images/bosses/boss-14.svg",
  "../../images/bosses/boss-15.svg",
  "../../images/bosses/boss-16.svg",
  "../../images/bosses/boss-17.svg",
  "../../images/bosses/boss-18.svg",
  "../../images/bosses/boss-19.svg",
  "../../images/bosses/boss-2.svg",
  "../../images/bosses/boss-20.svg",
  "../../images/bosses/boss-21.svg",
  "../../images/bosses/boss-3.svg",
  "../../images/bosses/boss-4.svg",
  "../../images/bosses/boss-5.svg",
  "../../images/bosses/boss-6.svg",
  "../../images/bosses/boss-7.svg",
  "../../images/bosses/boss-8.svg",
  "../../images/bosses/boss-9.svg",
  "../../images/bosses/final-boss.svg",
  "../../stylesheets/fonts/open-sans-latin.woff2",
  "../../stylesheets/fonts/jetbrains-mono-latin.woff2",
  "../../../badges/img/banner-level-1.svg",
  "../../../badges/img/banner-level-2.svg",
  "../../../badges/img/banner-level-3.svg"
];
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.min.js";

const PREFIX = "guinea-run-";
const CACHE = PREFIX + VERSION;
const THREE_ROOT = THREE_URL.slice(0, THREE_URL.lastIndexOf("/") + 1);
const NETWORK_ONLY = /\/hall-of-fame\/hall-of-fame\.json$/;

self.addEventListener("install", (event) => {
  event.waitUntil(saveGame());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(dropOlderCopies());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (VERSION === "dev" || request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  const served = url.origin === self.location.origin ? !NETWORK_ONLY.test(url.pathname) : Boolean(THREE_ROOT) && request.url.startsWith(THREE_ROOT);
  if (served) {
    event.respondWith(fromCopy(request));
  }
});

async function saveGame() {
  if (VERSION === "dev") {
    return;
  }
  const cache = await caches.open(CACHE);
  // "reload": straight from the server, never a file the browser kept from an older version
  await cache.addAll(FILES.map((file) => new Request(new URL(file, self.location).href, { cache: "reload" })));
  if (THREE_URL) {
    await saveScript(cache, THREE_URL, new Set());
  }
}

/** Saves a script and the scripts it imports by a relative path (Three.js imports its core). */
async function saveScript(cache, url, seen) {
  if (seen.has(url)) {
    return;
  }
  seen.add(url);
  const response = await fetch(url, { mode: "cors", cache: "reload" });
  if (!response.ok) {
    throw new Error("Guinea Run could not save " + url);
  }
  const text = await response.clone().text();
  await cache.put(url, response);
  for (const match of text.matchAll(/(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    await saveScript(cache, new URL(match[1], url).href, seen);
  }
}

async function dropOlderCopies() {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith(PREFIX) && name !== CACHE).map((name) => caches.delete(name)));
}

/** The saved copy first, the network otherwise; a file the list missed is added once fetched. */
async function fromCopy(request) {
  const cache = await caches.open(CACHE);
  const page = request.mode === "navigate";
  // play.html?lang=fr&from=vscode is the same page as play.html
  const saved = await cache.match(request, { ignoreSearch: page });
  if (saved) {
    return saved;
  }
  const response = await fetch(request);
  if (!page && response.ok && response.type !== "opaque") {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}
