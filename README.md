# Tic Tac Toe Arena — Tournament Multiplayer (Web + Android APK)

A real-time cross-platform multiplayer **Tic Tac Toe Tournament** game built with React, Vite, Firebase Realtime Database, and Capacitor Android. Play seamlessly across browsers and Android devices with **Endless League + On-Demand Championship Finals**, **Normal 3×3**, and **Expert Free-Choice Nested 3×3** with **Auto-Reset on Mini-Board Draws**.

- **Live Web App:** https://ttt-arena-quantum.web.app
- **Download Android APK:** https://github.com/QuantumEssence/tic-tac-toe-arena/releases/latest/download/TicTacToe-Arena-debug.apk
- **GitHub Repository:** https://github.com/QuantumEssence/tic-tac-toe-arena

---

## Features

- **Hybrid Endless League + On-Demand Finals**
  - Up to **16 players** (humans + optional Smart/Casual AI Bots) join a shared tournament room via 5-character Room Code, shareable invite link (`?room=CODE`), or the Live Public Rooms browser.
  - Players accumulate **Wins**, **Normal/Expert splits**, **Draws**, **Losses**, and **Win Streaks** on a live leaderboard ranked by **Total Wins** first.
  - Whenever ready, the Host launches **Championship Finals** (**Top 2** Grand Final or **Top 4** Semifinals + Final) and confirms Finals difficulty.
  - Ties in Finals automatically trigger **Sudden-Death Rematches** (swapping X and O) until a Champion is crowned.
- **Two Game Difficulties**
  - **Normal (3×3):** Classic fast-paced Tic-Tac-Toe.
  - **Expert (Free-Choice Nested 3×3):** Each cell of the macro 3×3 board contains its own 3×3 mini-board (81 squares). Play in *any* open cell of *any* un-won mini-board on every turn. Winning a mini-board claims that macro cell. If a mini-board fills without a winner, it flashes `DRAW • RESET` and clears back to 9 empty cells so players keep contesting that macro cell.
  - **Flexible Difficulty Controls:** Host can configure League matches as **Selectable per Match**, **All Normal**, or **All Expert**, while independently setting Championship Finals to **Expert** (default) or **Normal**.
- **Online + Offline Play Modes**
  - **Online Firebase Arena:** Instant Nickname & Avatar (no sign-up), Quick Match, direct Player Challenges, Play vs Bots, Live Spectating, and optional Host Turn Timer (`Off / 15s / 30s / 60s`).
  - **Local Pass-and-Play Mode:** Full offline single-device tournament engine with 2–16 humans + AI bots persisted to `localStorage`.

---

## Development

```bash
npm install
npm test        # Run engine, Bot AI, and bracket unit tests
npm run lint    # Run Oxlint checks
npm run dev     # Start local Vite dev server
npm run build   # Build production bundle
```

### Android APK Automation

Every push to `main` runs `.github/workflows/build-apk.yml`, executing tests, building the Vite bundle, syncing Capacitor Android assets, compiling `TicTacToe-Arena-debug.apk` with Gradle + Java 21, and publishing it to GitHub Releases.
