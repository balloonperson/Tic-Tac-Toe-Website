# Agent Instructions

When prompted to commit, assume the user means for you to commit to GitHub online and locally — both.

This project is based primarily in React.
Only edit or add any code if the user actually asks you to do something that requires so. Do not assume the user wants you to edit or add code.

## Cursor Cloud specific instructions

- The active product is a Vite + React 19 tic-tac-toe game. The entry point is `index.html` → `src/main.jsx` → `src/App.jsx`; game logic lives under `src/match`, `src/rules`, and `src/ai`.
- Standard commands are in `package.json`: `npm run dev` (dev server on port 5173, `strictPort`), `npm run build`, `npm run preview` (port 4173).
- The dev server uses `strictPort`, so it will fail rather than fall back if port 5173 is already taken; free the port instead of expecting an auto-increment.
- There are no lint or test scripts configured (no `lint`/`test` in `package.json`); `npm run build` is the main programmatic check.
- The root-level `plain_game.js`, `plain_index.html`, `tsx_app.tsx`, `tsx_index.html` are standalone single-file variants, and `optimize.py` / `optimize_quality_harder_tasks.py` are unrelated Python GEPA optimizer scripts — none are part of the React app build.
