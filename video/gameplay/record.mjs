// Records real gameplay of the game for the 20-second gameplay video.
//
// Plays two scripted rounds in Chrome and saves a screen recording of each:
//   public/gameplay/math.webm    a full Matematik round (one wrong answer) and the end screen
//   public/gameplay/danish.webm  the first spelling picks of a Dansk round
//   public/gameplay/markers.json when each moment happens, in ms from the start of each recording
// src/GameplayVideo.tsx cuts the clips from these markers.
//
// Every request to Supabase is answered here and never reaches the database,
// so the recording adds no events to bronze.
//
// Usage: serve game/ on GAME_URL (default http://localhost:8000/), then
//   node gameplay/record.mjs
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const GAME_URL = process.env.GAME_URL ?? "http://localhost:8000/";
const OUT = "public/gameplay";
const VIEWPORT = { width: 390, height: 760 }; // a phone in portrait
const SCALE = 2; // record at 2x for sharp text
const WRONG_AT = 4; // the question answered wrong on purpose

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs in the page before the game: a fixed random seed, so every recording
// asks the same questions, and a circle wherever the "finger" taps.
function pageSetup() {
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
      .tap-dot { position: fixed; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
        background: rgba(35, 39, 47, .28); border: 3px solid #fff; pointer-events: none; z-index: 9999;
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
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 600);
  }, true);
}

async function newRecording(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    serviceWorkers: "block",
    recordVideo: { dir: OUT + "/raw", size: { width: VIEWPORT.width * SCALE, height: VIEWPORT.height * SCALE } },
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
  await context.addInitScript(pageSetup);
  const page = await context.newPage();
  const t0 = Date.now();
  const markers = {};
  const mark = (name) => { markers[name] = Date.now() - t0; };
  return { context, page, markers, mark };
}

async function save({ context, page, markers }, name) {
  const video = page.video();
  await context.close();
  await video.saveAs(`${OUT}/${name}.webm`);
  await video.delete();
  return markers;
}

const tap = async (page, selector) => {
  await page.click(selector);
};

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
  const rec = await newRecording(browser);
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
  return save(rec, "math");
}

async function recordDanish(browser) {
  const rec = await newRecording(browser);
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
  return save(rec, "danish");
}

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome" });
try {
  await mkdir(OUT, { recursive: true });
  const markers = { math: await recordMath(browser), danish: await recordDanish(browser) };
  await writeFile(`${OUT}/markers.json`, JSON.stringify(markers, null, 2) + "\n");
  console.log(JSON.stringify(markers));
} finally {
  await browser.close();
}
