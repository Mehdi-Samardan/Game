# Pew-Pew

A fast-paced browser shooting game. Survive endless waves of enemies, collect power-ups, and chase your high score.

No installation needed — just open `index.html` in a browser.

---

## How to Play

| Action | Control |
| --- | --- |
| Move | `W A S D` |
| Aim | Mouse |
| Shoot | Click |
| Auto-fire | Hold click *(requires Rapid Fire power-up)* |
| Help panel | `H` |

---

## Power-ups

Power-ups drop randomly from killed enemies (22% chance).

| Icon | Name | Effect | Duration |
| --- | --- | --- | --- |
| 🔥 | Rapid Fire | Hold mouse to auto-fire | 30s |
| 🛡 | Shield | Full invincibility | 8s |
| ⏱ | Slow-Mo | Enemies at half speed | 10s |

---

## Scoring

- Hit a large enemy: **+5 pts** per hit, **+20 pts** to kill
- Chain kills within 2.5s to activate a **combo multiplier** (x2, x3...)
- Speed increases every 8 seconds — harder over time

---

## Themes

Pick a visual theme from the start screen: **Cyber**, **Inferno**, **Frost**, **Void**, **Mono**

Your choice is saved automatically.

---

## Run Locally

```bash
git clone https://github.com/Mehdi-Samardan/Game.git
cd Game
open index.html
```

Or with a local server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## Stack

Vanilla JS · HTML5 Canvas · CSS — no dependencies, no build step.

---

Made by [Mehdi Samardan](https://github.com/Mehdi-Samardan)
