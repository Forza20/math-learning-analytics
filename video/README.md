# Introduction video

A 40-second square video (1080×1080, 30 fps) that introduces the project, made
entirely in code with [Remotion](https://www.remotion.dev/), React and TypeScript.
It plays without sound: captions carry the story.

| Frames | Scene | File |
|---|---|---|
| 0–120 | Title: a math game, and the pipeline behind it | `src/scenes/IntroScene.tsx` |
| 120–330 | A round of the game; each answer becomes an event | `src/scenes/GameScene.tsx` |
| 330–450 | The browser can only insert; no personal data | `src/scenes/SecurityScene.tsx` |
| 450–660 | Bronze → silver → gold → live, nightly | `src/scenes/PipelineScene.tsx` |
| 660–840 | How mistakes are classified | `src/scenes/MistakesScene.tsx` |
| 840–1050 | Key figures and the times-tables chart (live data) | `src/scenes/DashboardScene.tsx` |
| 1050–1200 | Stack, link and role | `src/scenes/OutroScene.tsx` |

## Gameplay video (20 s)

`GameplayVideo` is a 20-second square video for LinkedIn, cut from real screen
recordings of the game, with captions beside a phone frame.

1. `gameplay/record.mjs` plays a scripted Matematik round (one wrong answer on
   purpose) and three Dansk picks in Chrome with Playwright, with a fixed random
   seed. It saves every screen frame with its time, plus `markers.json`, to
   `public/gameplay/`. Supabase calls are answered inside the browser, so no events
   reach bronze.
2. `src/GameplayVideo.tsx` cuts six clips from those markers and adds an outro.

On GitHub the **video** workflow's `gameplay` job does both and uploads the
artifact `gameplay-video`. Locally (Chrome installed, game served on port 8000):

```bash
cd video
npm ci
npm install --no-save playwright-core@1.49.1
python -m http.server 8000 --directory ../game   # in another terminal
node gameplay/record.mjs
npx remotion render GameplayVideo out/gameplay.mp4 --crf=18
```

## Render

On GitHub: run the **video** workflow (Actions tab). It uploads `intro.mp4` and one
still per scene as the artifact `intro-video`.

Locally (needs about 650 MB free for packages and a headless Chrome):

```bash
cd video
npm ci
npm run dev       # Remotion Studio preview
npm run render    # out/intro.mp4
```

The chart numbers in `DashboardScene.tsx` are copied from the live dashboard; update
them if the data changes a lot.
