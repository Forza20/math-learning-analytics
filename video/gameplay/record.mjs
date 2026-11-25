// Records real gameplay of the game for the 20-second gameplay video.
//
// Plays two scripted rounds in Chrome and saves every screen frame with its time:
//   public/gameplay/math/<n>.jpg    a full Matematik round (one wrong answer) and the end screen
//   public/gameplay/danish/<n>.jpg  the first spelling picks of a Dansk round
//   public/gameplay/markers.json    per round: when each moment happens and when each frame was
//                                   painted, both in ms from the first frame
// src/GameplayVideo.tsx cuts the clips from these markers.
// Frames come from Chrome's screencast with their own timestamps. Playwright's
// built-in video was tried first, but it stretches time during animations, so
// the markers drifted by seconds over a round.
//
// Every request to Supabase is answered here and never reaches the database,
// so the recording adds no events to bronze.
//
// Usage: serve game/ on GAME_URL (default http://localhost:8000/), then
//   node gameplay/record.mjs
import { chromium } from "playwright-core";
import { mkdir, rm, writeFile } from "node:fs/promises";

const GAME_URL = process.env.GAME_URL ?? "http://localhost:8000/";
const OUT = "public/gameplay";
const PHONE = { width: 412, height: 800 }; // a phone in portrait, in CSS px
const ZOOM = 2; // the page is zoomed 2x in a 2x window, for sharp frames
const WRONG_AT = 4; // the question answered wrong on purpose

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs in the page before the game: a fixed random seed, so every recording
// asks the same questions, a 2x zoom, and a circle wherever the "finger" taps.
// The circles sit outside the zoomed body, at the tap's window position.
function pageSetup(zoom) {
  let seed = 20261125;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = `
      body { zoom: ${zoom}; }
      .tap-dot { position: fixed; width: ${23 * zoom}px; height: ${23 * zoom}px; margin: -${11.5 * zoom}px 0 0 -${11.5 * zoom}px;
        border-radius: 50%; background: rgba(35, 39, 47, .28); border: ${1.5 * zoom}px solid #fff; pointer-events: none; z-index: 9999;
        animation: tap-dot .55s ease-out forwards; }
      @keyframes tap-dot { from { transform: scale(.5); opacity: 1; } to { transform: scale(1.3); opacity: 0; } }
      ::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(style);
  });
  addEventListener("pointerdown", (e) => {
    const dot = document.createElement("div");
    dot.className = "tap-dot";
    dot.style.left = e.clientX + "px";
    dot.style.top = e.clientY + "px";
    document.documentElement.appendChild(dot);
    setTimeout(() => dot.remove(), 600);
  }, true);
}

async function newRecording(browser, name) {
  const context = await browser.newContext({
    viewport: { width: PHONE.width * ZOOM, height: PHONE.height * ZOOM },
    serviceWorkers: "block",
  });
  // Answer every Supabase call locally: nothing is sent to the database.
  await context.route(/supabase\.co/, (route) =>
    route.fulfill({
      status: route.request().method() === "OPTIONS" ? 204 : 201,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "POST, OPTIONS",
      },
      body: "",
    }),
  );
  await context.addInitScript(pageSetup, ZOOM);
  const page = await context.newPage();

  // Save each painted frame with Chrome's own timestamp (wall clock, seconds).
  const dir = `${OUT}/${name}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const frames = [];
  const writes = [];
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    writes.push(writeFile(`${dir}/${frames.length}.jpg`, Buffer.from(data, "base64")));
    frames.push(metadata.timestamp * 1000);
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88 });

  const marks = {};
  const mark = (label) => { marks[label] = Date.now(); };
  return { context, page, cdp, frames, writes, marks, mark };
}

// Stops the screencast; returns marks and frame times in ms from the first frame.
async function save({ context, cdp, frames, writes, marks }) {
  await cdp.send("Page.stopScreencast");
  await Promise.all(writes);
  await context.close();
  const t0 = frames[0];
  const rel = (t) => Math.round(t - t0);
  return {
    marks: Object.fromEntries(Object.entries(marks).map(([k, t]) => [k, rel(t)])),
    frames: frames.map(rel),
  };
}

const tap = (page, selector) => page.click(selector);

// The question with this number is on screen and the keypad is open.
const questionReady = (page, i) =>
  page.waitForFunction((n) => state.index === n && state.current && !state.locked, i, { timeout: 20000 });

const goBanner = (page) =>
  page.waitForFunction(() => document.getElementById("banner").textContent === "AFSTED!", null, { timeout: 10000 });

async function openGame(page, subjectLabel, levelLabel, mark) {
  await page.goto(GAME_URL, { waitUntil: "load" });
  await sleep(900);
  mark("open");
  await tap(page, `#topics .choice:has-text("${subjectLabel}")`);
  mark("tapSubject");
  await sleep(500);
  await tap(page, `#levels .choice:has-text("${levelLabel}")`);
  mark("tapLevel");
  await sleep(700);
  await tap(page, "#startBtn");
  mark("start");
  await goBanner(page);
  mark("go");
}

async function recordMath(browser) {
  const rec = await newRecording(browser, "math");
  const { page, mark } = rec;
  await openGame(page, "Matematik", "Mellem", mark);

  for (let i = 1; i <= 10; i++) {
    await questionReady(page, i);
    mark("q" + i);
    const answer = await page.evaluate(() => state.current.answer);
    // One plausible slip, so the video shows the +10 seconds penalty.
    const typed = String(i === WRONG_AT ? answer + 1 : answer);
    await sleep(i === WRONG_AT ? 400 : 650);
    for (const digit of typed) {
      await tap(page, `#keypad [data-key="${digit}"]`);
      await sleep(210);
    }
    await sleep(150);
    await tap(page, "#submitBtn");
    mark("a" + i);
  }

  await page.waitForSelector("#end:not(.hidden)", { timeout: 20000 });
  mark("end");
  await sleep(3500);
  return save(rec);
}

async function recordDanish(browser) {
  const rec = await newRecording(browser, "danish");
  const { page, mark } = rec;
  await openGame(page, "Dansk", "Mellem", mark);

  for (let i = 1; i <= 3; i++) {
    await questionReady(page, i);
    mark("q" + i);
    const word = await page.evaluate(() => state.current.answer);
    await sleep(1000); // reading the three spellings
    await tap(page, `#keypad [data-word="${word}"]`);
    mark("a" + i);
  }
  await questionReady(page, 4);
  mark("q4");
  await sleep(800);
  return save(rec);
}

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome" });
try {
  await mkdir(OUT, { recursive: true });
  const markers = { math: await recordMath(browser), danish: await recordDanish(browser) };
  await writeFile(`${OUT}/markers.json`, JSON.stringify(markers, null, 2) + "\n");
  for (const [name, r] of Object.entries(markers)) {
    console.log(name, r.frames.length, "frames", JSON.stringify(r.marks));
  }
} finally {
  await browser.close();
}
