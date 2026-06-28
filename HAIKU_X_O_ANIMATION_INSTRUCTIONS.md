# Haiku X/O Animation Instructions

Use this only for X and O placement animation tasks.

## Main Rule

Do the small animation task. Do not explore the whole app.

## Read These First

Read only the files needed for the task:

- `src/animations/place/`
- `src/animations/helpers.js`
- `src/styles/animations.css`
- `src/ui/board/Cell.jsx`
- `src/ui/board/MarkX.jsx`
- `src/ui/board/MarkO.jsx`

Do not read these unless the user asks:

- `src/ai/`
- `src/rules/`
- `src/setup/`
- `src/match/`
- unrelated style files

## Stop Reading

Stop investigating once you know:

- the target files
- the trigger
- the motion

Then edit. Do not keep searching.

## Code Rules

- Put X/O placement animation code in `src/animations/place/`.
- Put animation CSS in `src/styles/animations.css`.
- Keep reduced-motion support.
- Do not change game rules.
- Do not change AI.
- Do not change setup screens.
- Do not add packages.
- If you create or replace an animation, make sure `Cell.jsx` actually renders it.

## Verification

Skip verification by default.

Only verify if:

- the user asks
- the edit is risky
- you need proof that the code works

If you verify, run the smallest useful check. Do not paste successful command output.

## Output

Default final answer:

`Done.`

Say more only if blocked, verification failed, or the user asked for details.
