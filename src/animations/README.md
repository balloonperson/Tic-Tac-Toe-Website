# X and O Animations

**Subject:** Motion and timing for X and O marks — placement and three-in-a-row win highlights.

## Planned structure

- `place/` — placement animations
  - `AnimatedMarkX.jsx`, `AnimatedMarkO.jsx`
  - `usePlaceAnimation.js`
- `winLine/` — winning line animations
  - `WinLineHighlight.jsx`
  - `useWinLineAnimation.js`
- `helpers.js` — timing constants, `prefers-reduced-motion` guard

## Boundaries

- Static mark SVGs live in `src/ui/board/`
- Win detection lives in `src/rules/`
- Match state and `winningLine` exposure live in `src/match/`
- Animation keyframes will live in `src/styles/animations.css` when built

## Consumers

`src/ui/board/Cell.jsx` and `src/ui/board/Board.jsx` will import animated components from this module.
