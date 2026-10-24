/*
 * How much the game draws, so a small phone stays smooth.
 *
 * The first tier is a guess from the device. Then, past the first seconds of a
 * world, the frame time is measured every two seconds, and the game drops one
 * tier when two samples in a row are slow, at most twice. It never climbs back: a tier that flips back and forth looks worse
 * than one that stays a little lower.
 */

export const SAMPLE_WEIGHTS = [143, 25, 65, 61, 45, 116, 163, 168];

export const TIERS = [
  // 0: weak phones
  { name: "low", pixelRatio: 1, shadows: false, drawDistance: 70, antialias: false, bloom: false },
  // 1: most phones and small laptops
  { name: "medium", pixelRatio: 1.5, shadows: false, drawDistance: 95, antialias: true, bloom: false },
  // 2: desktops
  { name: "high", pixelRatio: 1.75, shadows: true, drawDistance: 110, antialias: true, bloom: true }
];

const SAMPLE_MS = 2000;
// The first seconds of a world compile its shaders and load its models: not a slow device
const WARMUP_MS = 3000;
// One slow sample can be a hiccup: two in a row are the device
// About 52 frames per second: below it a desktop feels slow, even when it never stutters
const SLOW_FRAME_MS = 19;
const MAX_DROPS = 2;
const SLOW_SAMPLES = 2;

/** The tier to start with, from what the browser says about the device. */
export function initialTier() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 500;
  if (cores <= 2 || memory <= 2) {
    return 0;
  }
  if (coarse || small) {
    return 1;
  }
  return 2;
}

/** Measures frames and calls onDrop(newTier) when the device cannot keep up. */
export function createQualityMonitor(tier, onDrop) {
  let current = tier;
  let drops = 0;
  let elapsed = 0;
  let frames = 0;
  let warmup = WARMUP_MS;
  let slow = 0;
  return {
    get tier() {
      return current;
    },
    frame(deltaMs) {
      // A long pause (tab hidden, debugger) is not a slow device
      if (deltaMs > 250) {
        return;
      }
      if (warmup > 0) {
        warmup -= deltaMs;
        return;
      }
      elapsed += deltaMs;
      frames += 1;
      if (elapsed < SAMPLE_MS) {
        return;
      }
      const average = elapsed / frames;
      elapsed = 0;
      frames = 0;
      slow = average > SLOW_FRAME_MS ? slow + 1 : 0;
      if (slow >= SLOW_SAMPLES && current > 0 && drops < MAX_DROPS) {
        slow = 0;
        current -= 1;
        drops += 1;
        onDrop(current);
      }
    },
    reset() {
      elapsed = 0;
      frames = 0;
      warmup = WARMUP_MS;
      slow = 0;
    }
  };
}

/** True when the reader asked the system for less motion. */
export function reducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
