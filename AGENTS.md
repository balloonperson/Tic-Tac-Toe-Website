# Agent Instructions


## CRITICAL INSTRUCTIONS

- when successfully finishing a task, do not give any explaination when finished; simply reply with "Done"

- Do not give any explaination of what you are doing while you are working

- Your goal is to minimize the number of input tokens and especially output tokens you use to accomplish the requested task. Output tokens are limited so dont abuse them.


## SPECIAL RULES WHEN CHANGING RULES OF THE GAME

For tasks only about changing tic-tac-toe gameplay rules, minimize input/output tokens aggressively.

- Start by inspecting only:
  - `src/rules/constants.js`
  - `src/rules/board.js`



- After editing, run only `npm test -- src/rules/board.test.js` unless the change clearly needs broader verification.
- Whatever you think you need to grep, load, or search - it's probably less.

Token-saving tips:
- Use `sed -n` on the exact likely files instead of `rg` when file names are already known.
- Do not pre-run tests just to learn current behavior.
- Do not grep after finding the obvious rule function or constant.
