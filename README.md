# 🐍 NEON SERPENT OVERDRIVE

An **improved sequel to [NEON SERPENT](../NeonSerpent/README.md)**: the same 60-second neon snake
survival run, with a smarter AI, a pulse that works on both offence and defence, ranks,
procedural synthwave music and a full visual overhaul.

<p align="center">
  <img src="assets/screenshots/gameplay-overview.png" width="760" alt="NEON SERPENT OVERDRIVE gameplay" />
</p>

No install, no local server, **works fully offline** — every library is vendored in `vendor/`.

---

## 🚀 Play

1. Drop `index.html` into a browser (or double-click it)
2. Pick a difficulty chip (EASY / NORMAL / HARD)
3. **START GAME** → countdown → go

## 🎮 Controls

| | Desktop | Touch |
|---|---|---|
| Steer | Move the mouse (point where the head should go) | Drag anywhere on screen |
| Steer (new) | `← →` or `A D` | — |
| Pulse | `SPACE` | **Double-tap** or the **PULSE** button |
| Pause (new) | `Esc` / `P` | top-right ❚❚ button |
| Start / retry (new) | `Enter` | — |
| Music toggle (new) | `M` | 🎵 button |

> The pointer within 40 px of the head is ignored (original rule) — now drawn as a dotted ring.
> Switching to another tab or window **pauses the game automatically**.

## ⚔️ Death rules (inherited)

| Situation | Result |
|---|---|
| You cross your own tail | 💀 game over |
| Your head touches an AI body | 💀 game over |
| Head-on with an AI head | 💀 game over (the AI dies with you) |
| An AI head grazes your body | 🎉 **kill + score**, the wreck spills orbs |
| You hit a wall | ❌ bounce only, no death |

- Invincible for the first 3 s and during the 👻 power-up (green ring). While invincible, **the AI is the one that dies**
- A **pulsed (stunned) AI is harmless both ways** — your escape card
- EASY gives one **extra life** (respawn with a shorter body)

## ✨ What improved over the original

1. **Pulse = offense + defense.** Still vacuums orbs, but now **stuns every AI in range for ~1 s**
   (frozen, non-lethal). Longer and wider while OVERDRIVE is active.
2. **Rebuilt AI.** Sampled steering that avoids its own tail, other snakes and walls,
   **hunts** by cutting in front of your head (with a dashed charge telegraph), and only takes risks while hunting.
3. **The 60 seconds now grow.** New power-ups ⏳ **+5 s**, 🧲 magnet, ✦ **double score**;
   ✂ shrink is no longer permanent; rare **golden orbs** (×5, moving, despawning) and 3–5 orb **clusters** appear.
4. **Ranks & OVERDRIVE.** `D → C → B → A → S → SS → S+` with a live HUD bar, fanfare on rank-up,
   and **combo ×12 triggers OVERDRIVE** (background tints, music lifts, pulse grows).
5. **Procedural soundtrack (Tone.js).** Synthwave layers stack with the situation:
   menu = pads+bass → playing = +kick → combo ≥5 / last 15 s = +drums+arp → OVERDRIVE = +lead.
   All SFX are synthesised, and eating an orb climbs the scale with your combo.
6. **Readability & juice.** Bloom glow, synthwave sun + perspective grid, ribbon-like snake bodies
   with a bright core, damage vignette, hit-stop on kills, floating score text,
   effects setting **FULL / SOFT / OFF** and graphics **AUTO / HIGH / LOW** (auto-downgrades on low FPS).
7. **Records & languages.** Top 20 scores tagged by difficulty (score / max combo / kills / date),
   **your original `neonSerpentScores` are migrated automatically** (shown as CLASSIC),
   and the whole UI switches instantly between 日本語 / English / 한국어 / 中文.

## 🌟 Power-ups (diamonds)

| Icon | Effect |
|---|---|
| ⚡ | speed +1.2 (cap 6) |
| 👻 | invincible 5 s |
| 📈 | grow by 3 |
| ✂ | shrink AI (they slowly recover) |
| 🧲 | magnet orbs for 8 s |
| ✦ | double score for 8 s |
| ⏳ | +5 s on the clock |

> AI snakes chase power-ups too, so expect a fight over them.

## 🧩 Difficulty

| | AI snakes | Score × | Notes |
|---|---|---|---|
| EASY | 2 | ×1.0 | one extra life, timid AI |
| NORMAL | 3 | ×1.25 | closest to the original |
| HARD | 4 | ×1.6 | long hunt range, AI uses pulses |

## 🕹️ Tips

- A hunting AI that is allowed to keep coming **crashes into your body and dies** — bait it
- Fire the pulse when you are **boxed in**, not only over orb clusters
- Grab ⏳ to keep a high combo multiplier alive for longer
- While 👻 is active, contact kills one-way: sweep your body through AI snakes

## ⚙️ Tech

| | |
|---|---|
| Code | HTML + CSS + plain JavaScript (split files, **no ES modules** so `file://` just works) |
| Graphics | Canvas 2D — downsampled bloom, layered synthwave background, particles |
| Audio | **Tone.js 15.1.22** (procedural BGM + SFX) |
| UI motion | **GSAP 3.15.1**, **canvas-confetti 1.9.4** (new-record celebration) |
| Fonts | Orbitron / Chakra Petch woff2 (bundled, SIL OFL) |
| Storage | localStorage (top 20 scores, settings, language) |
| Network | **zero requests at runtime** — everything lives in `vendor/` |

### Layout

```
index.html              shell, HUD, panels
css/style.css           neon UI skin
js/i18n.js              strings for 4 languages
js/util.js              constants (original values kept), ranks, saves
js/audio.js             Tone.js rig (BGM + SFX)
js/entities.js          snake / orb / power-up / pulse / particles
js/ai.js                steering AI, hunt, charge telegraph
js/render.js            background, bloom, snake rendering
js/input.js             mouse / touch / keyboard / PULSE button
js/ui.js                HUD, panels, toasts, high scores
js/game.js              rules, scoring, state machine, settings
vendor/                 GSAP, canvas-confetti, Tone.js, fonts
tests/browser_test.ps1  headless-Edge (CDP) smoke test
```

### Testing

```powershell
powershell -ExecutionPolicy Bypass -File tests\browser_test.ps1            # desktop 1280x720
powershell -ExecutionPolicy Bypass -File tests\browser_test.ps1 -Mobile    # mobile 430x860
```

It boots the page over `file://`, clicks through the real UI, drives real key/touch events,
checks pulse stun, kills, pause, ranks, all four languages, score persistence and FPS,
and writes screenshots into `tests/shots/`.

## 📸 Screenshots

<p align="center">
  <img src="assets/screenshots/title-screen.png" width="760" alt="Title screen with attract mode" />
</p>
<p align="center">
  <img src="assets/screenshots/pulse-stun.png" width="760" alt="Pulse stunning an AI snake" />
</p>
<p align="center">
  <img src="assets/screenshots/mobile-portrait.png" width="330" alt="Mobile portrait view" />
</p>

## 📄 Credits

Tone.js (MIT) · GSAP (standard license) · canvas-confetti (MIT) · Orbitron & Chakra Petch (SIL OFL 1.1).
Based on the original NEON SERPENT.
