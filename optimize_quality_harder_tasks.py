"""
GEPA instruction optimizer — tuned for stronger coding performance and
higher-quality implementations while keeping token usage in roughly the same range.

WHAT RUNS WHEN YOU TYPE  `python optimize.py`:
  1. optimize_anything() picks a candidate instruction and runs your task on the trainset
  2. evaluate() -> metric() scores correctness, completeness, integration, and code quality
  3. the reflection model reads feedback via oa.log() ASI and rewrites the instruction
  4. it keeps the better candidates and repeats until max_metric_calls is hit
  5. it returns result.best_candidate — your optimized instruction

THE 3 THINGS YOU MUST FILL IN (marked TODO):
  - your ANTHROPIC_API_KEY (env var, below)
  - run_task()      : how one task actually executes
  - check_quality() : how you grade the result (compiles / tests / a11y -> 0..1)
"""

import os
import re
from pathlib import Path

import anthropic
import gepa.optimize_anything as oa
from gepa.optimize_anything import EngineConfig, GEPAConfig, ReflectionConfig, optimize_anything

# ------------------------------------------------------------------ #
# 0. API KEY  (GEPA calls Anthropic through LiteLLM; key comes from env)
#    export ANTHROPIC_API_KEY=sk-ant-...     <-- do this in your shell
# ------------------------------------------------------------------ #
assert os.getenv("ANTHROPIC_API_KEY"), "Set ANTHROPIC_API_KEY in your environment first."

ROOT = Path(__file__).resolve().parent
ANTHROPIC_CLIENT = anthropic.Anthropic()
HAIKU_MODEL = "claude-haiku-4-5"

# Paths relative to project root — board, cells, marks, styles, win logic, match state.
BOARD_SOURCE_RELATIVE = [
    "src/ui/board/Board.jsx",      # board grid + cell layout
    "src/ui/board/Cell.jsx",       # cell buttons + mark mounting
    "src/ui/board/MarkX.jsx",      # X mark SVG
    "src/ui/board/MarkO.jsx",      # O mark SVG
    "src/styles/board.css",        # board, cell, and mark styles
    "src/rules/constants.js",      # WIN_LINES definitions
    "src/rules/board.js",          # checkWinner / resolveGameOutcome
    "src/match/useMatch.js",       # board state, turns, win/draw handling
]

BOARD_SOURCE_FILES = [ROOT / rel for rel in BOARD_SOURCE_RELATIVE]


def verify_board_source_files() -> None:
    missing = [rel for rel in BOARD_SOURCE_RELATIVE if not (ROOT / rel).is_file()]
    if missing:
        raise FileNotFoundError(
            "BOARD_SOURCE_FILES paths not found under project root:\n"
            + "\n".join(f"  MISSING  {path}" for path in missing)
        )


verify_board_source_files()

# ------------------------------------------------------------------ #
# 1. QUALITY / TOKEN POLICY
#    Quality is the optimization target. Token count is not rewarded.
#    A small penalty applies only to unusually large responses, preventing
#    prompt evolution from gaining score through needless verbosity.
# ------------------------------------------------------------------ #
QUALITY_FLOOR = 0.72
OUTPUT_TOKEN_SOFT_LIMIT = 6000
OUTPUT_TOKEN_HARD_LIMIT = 8000
MAX_BLOAT_PENALTY = 0.08


def read_board_source() -> str:
    parts = []
    for rel in BOARD_SOURCE_RELATIVE:
        path = ROOT / rel
        parts.append(f"=== {rel} ===\n{path.read_text(encoding='utf-8')}")
    return "\n\n".join(parts)


def _balanced_delimiters(text: str) -> bool:
    pairs = {"(": ")", "[": "]", "{": "}"}
    stack = []
    for char in text:
        if char in pairs:
            stack.append(pairs[char])
        elif char in pairs.values():
            if not stack or stack.pop() != char:
                return False
    return not stack


def _looks_truncated(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < 120:
        return True
    if re.search(r"\.\.\.\s*$", stripped):
        return True
    if re.search(r"(truncated|continued in|remaining code|omitted)", stripped, re.I):
        return True
    tail = stripped[-80:]
    if not re.search(r"[}\];>`)]$", tail):
        return True
    return False


def _syntax_ok(output: str) -> bool:
    if not output or not output.strip():
        return False
    if _looks_truncated(output):
        return False
    if not _balanced_delimiters(output):
        return False
    code_markers = (
        "function", "export", "import", "className", "return", ".jsx", ".css",
        "@keyframes", "const ", "let ", "var ",
    )
    return any(marker in output for marker in code_markers)


def _matches_need(output: str, need: str) -> bool:
    text = output.lower()
    patterns = {
        "@keyframes": [r"@keyframes\s+[\w-]+"],
        "keyframes": [r"@keyframes\s+[\w-]+"],
        "animation": [r"\banimation\s*:", r"\banimation-"],
        "transition": [r"\btransition\s*:", r"\btransition-"],
        "scale": [r"scale\s*\(", r"transform\s*:[^;]*scale"],
        "fade": [r"opacity\s*:", r"fade", r"@keyframes\s+\w*fade"],
        "bounce": [r"bounce", r"cubic-bezier\s*\([^)]*1\.\d+"],
        "rotate": [r"rotate\s*\(", r"transform\s*:[^;]*rotate"],
        "stroke": [r"stroke-dashoffset", r"stroke-dasharray", r"draw"],
        "glow": [r"box-shadow", r"filter\s*:", r"glow", r"drop-shadow"],
        "pulse": [r"pulse", r"@keyframes\s+\w*pulse"],
        "shimmer": [r"shimmer", r"gradient", r"background-position"],
        "elastic": [r"elastic", r"cubic-bezier"],
        "timing": [r"\d+ms", r"\d+\.\d+s", r"duration", r"animation-duration"],
    }
    for pattern in patterns.get(need, [re.escape(need)]):
        if re.search(pattern, text, re.I):
            return True
    return False


def _has_animation_hook(output: str, expected: dict) -> bool:
    text = output.lower()
    generic_hooks = ("@keyframes", "animation:", "animation ", "transition:", "transition ")
    if not any(hook in text for hook in generic_hooks):
        return False
    needs = expected.get("needs", [])
    if not needs:
        return True
    return all(_matches_need(output, need) for need in needs)


def _has_placement_target(output: str, expected: dict) -> bool:
    text = output.lower()
    mark_targets = (
        r"mark-x", r"mark-o", r"\.mark\b", r"cell-button", r"markx", r"marko",
    )
    if not any(re.search(pattern, text) for pattern in mark_targets):
        return False
    placement_hooks = (
        r"className\s*=\s*[\"'][^\"']*(?:place|enter|pop|fade|bounce|rotate|animate)",
        r"class\s*=\s*[\"'][^\"']*(?:place|enter|pop|fade|bounce|rotate|animate)",
        r"\.mark[^{]*\{[^}]*(?:animation|transition)",
        r"\.cell-button[^{]*\{[^}]*(?:animation|transition)",
    )
    return any(re.search(pattern, text) for pattern in placement_hooks)


def _has_win_line_treatment(output: str) -> bool:
    text = output.lower()
    win_markers = (
        r"win[-_]?line", r"winning[-_]?line", r"winning[-_]?cells",
        r"winningline", r"winline", r"winningindices", r"winning[-_]?indices",
    )
    has_win_marker = any(re.search(pattern, text) for pattern in win_markers)
    has_win_class = bool(
        re.search(r"className\s*=\s*[\"'][^\"']*win", text)
        or re.search(r"class\s*=\s*[\"'][^\"']*win", text)
        or re.search(r"\.win[-_\w]*\s*\{", text)
    )
    has_win_animation = bool(
        re.search(r"win[^;\n{]*(?:animation|transition|@keyframes)", text)
    )
    return has_win_marker or (has_win_class and has_win_animation)


# ------------------------------------------------------------------ #
# 2. YOUR TASK RUNNER  — TODO: make this actually do the button task.
#    Must return the output AND the input/output token counts.
#    If it's a multi-step agent, SUM tokens across every step here.
# ------------------------------------------------------------------ #
def run_task(instruction: str, example: dict) -> dict:
    source_code = read_board_source()
    user_content = f"{example['input']}\n\nCURRENT CODE:\n{source_code}"

    resp = ANTHROPIC_CLIENT.messages.create(
        model=HAIKU_MODEL,
        max_tokens=8192,
        system=instruction,
        messages=[{"role": "user", "content": user_content}],
    )

    text_parts = [
        block.text for block in resp.content
        if getattr(block, "text", None)
    ]
    output = "\n".join(text_parts) if text_parts else ""

    return {
        "output": output,
        "input_tokens": resp.usage.input_tokens,
        "output_tokens": resp.usage.output_tokens,
    }


# ------------------------------------------------------------------ #
# 3. YOUR QUALITY GATE  — TODO: objective check, returns 0.0 .. 1.0
#    This is what stops the optimizer from cheating by doing less work.
# ------------------------------------------------------------------ #
def _extract_file_sections(output: str) -> dict[str, str]:
    """Parse === path === sections from the model's full-file response."""
    header = re.compile(r"^===\s+(.+?)\s+===\s*$", re.MULTILINE)
    matches = list(header.finditer(output))
    sections: dict[str, str] = {}
    for index, match in enumerate(matches):
        path = match.group(1).strip().replace("\\", "/")
        body_start = match.end()
        body_end = matches[index + 1].start() if index + 1 < len(matches) else len(output)
        body = output[body_start:body_end].strip()
        if body:
            sections[path] = body
    return sections


def _exact_requested_values_present(output: str, task: str) -> bool:
    """Require explicit numeric values from the request to survive into the code."""
    values = re.findall(r"(?<![\w.])-?\d+(?:\.\d+)?(?:ms|s|deg)?", task.lower())
    meaningful = [value for value in values if re.search(r"(?:ms|s|deg)$", value)]
    return all(value in output.lower() for value in meaningful)


def _respects_single_mark_scope(output: str, task: str) -> bool:
    text = output.lower()
    task_text = task.lower()
    if "only the x" in task_text or "leave o unchanged" in task_text:
        return ("markx" in text or "mark-x" in text) and not bool(
            re.search(r"(?:marko|mark-o)[^\n{]{0,100}(?:animation|transition)", text)
        )
    if "only the o" in task_text or "x can appear instantly" in task_text:
        return ("marko" in text or "mark-o" in text) and not bool(
            re.search(r"(?:markx|mark-x)[^\n{]{0,100}(?:animation|transition)", text)
        )
    return True


def _has_accessibility_preservation(output: str) -> bool:
    text = output.lower()
    return any(marker in text for marker in (
        "aria-label", "aria-pressed", "role=", "disabled=", "<button", "prefers-reduced-motion"
    ))


def _has_reduced_motion_support(output: str) -> bool:
    return bool(re.search(r"prefers-reduced-motion\s*:\s*reduce", output, re.I))


def _has_complete_file_output(output: str) -> bool:
    sections = _extract_file_sections(output)
    if not sections:
        return False
    allowed_suffixes = (".jsx", ".js", ".css", ".tsx", ".ts")
    if not all(path.endswith(allowed_suffixes) for path in sections):
        return False
    return all(len(body) >= 80 and not _looks_truncated(body) for body in sections.values())


def _scope_is_plausible(output: str, example: dict) -> bool:
    sections = _extract_file_sections(output)
    if not sections:
        return False
    case = example.get("expected", {}).get("case", "placement")
    paths = " ".join(sections).lower()
    if "board.css" not in paths and not any("style" in body.lower() for body in sections.values()):
        return False
    if case == "placement":
        return any(name in paths for name in ("cell", "markx", "marko", "board"))
    return any(name in paths for name in ("board", "cell", "match", "rules"))


def check_quality(output: str, example: dict) -> tuple[float, list[str]]:
    expected = example.get("expected", {})
    case = expected.get("case", "placement")
    task = example.get("input", "")
    checks: list[tuple[str, float, bool]] = [
        ("syntactically plausible and not truncated", 0.16, _syntax_ok(output)),
        ("complete full-file sections with path headers", 0.14, _has_complete_file_output(output)),
        ("all requested animation mechanisms are present", 0.18, _has_animation_hook(output, expected)),
        ("exact requested timing/angle values are preserved", 0.10, _exact_requested_values_present(output, task)),
        ("changes are wired into plausible project files", 0.10, _scope_is_plausible(output, example)),
        ("single-mark scope is respected", 0.08, _respects_single_mark_scope(output, task)),
        ("existing interactive accessibility is preserved", 0.08, _has_accessibility_preservation(output)),
        ("reduced-motion users are handled", 0.06, _has_reduced_motion_support(output)),
    ]

    if case == "win_line":
        checks.append(("winning-line state/styling is actually wired", 0.10, _has_win_line_treatment(output)))
    else:
        checks.append(("placement animation targets the mark/cell", 0.10, _has_placement_target(output, expected)))

    score = sum(weight for _, weight, passed in checks if passed)
    failures = [label for label, _, passed in checks if not passed]
    return min(score, 1.0), failures


# ------------------------------------------------------------------ #
# 4. THE METRIC  — score steers selection, feedback steers the rewrite.
#    (You do NOT edit the loop; you only define this.)
# ------------------------------------------------------------------ #
def metric(example, candidate):
    result = run_task(candidate["system_prompt"], example)
    quality, failures = check_quality(result["output"], example)
    output_tokens = result["output_tokens"]

    # Token use is held roughly steady, not minimized. Only excessive bloat loses score.
    if output_tokens <= OUTPUT_TOKEN_SOFT_LIMIT:
        bloat_penalty = 0.0
    else:
        span = max(1, OUTPUT_TOKEN_HARD_LIMIT - OUTPUT_TOKEN_SOFT_LIMIT)
        excess_ratio = min(1.0, (output_tokens - OUTPUT_TOKEN_SOFT_LIMIT) / span)
        bloat_penalty = MAX_BLOAT_PENALTY * excess_ratio

    score = quality - bloat_penalty

    if quality < QUALITY_FLOOR:
        feedback = (
            f"FAILED quality gate: quality={quality:.2f}, score={score:.2f}. "
            f"Missing or weak: {', '.join(failures) if failures else 'unknown quality issue'}. "
            "Improve correctness, exact task compliance, full-file completeness, project wiring, "
            "and preservation of existing behavior. Do not solve this by adding explanation. "
            f"Token usage: input={result['input_tokens']}, output={output_tokens}."
        )
    else:
        feedback = (
            f"Quality={quality:.2f}, final score={score:.2f}. "
            f"Remaining weaknesses: {', '.join(failures) if failures else 'none detected'}. "
            "Seek a more reliable implementation: obey exact requested values and scope, wire state "
            "through the existing architecture, return complete changed files, preserve game logic "
            "and accessibility, and include reduced-motion handling. "
            f"Token usage is acceptable unless bloated: input={result['input_tokens']}, "
            f"output={output_tokens}, bloat penalty={bloat_penalty:.3f}."
        )

    return {"score": score, "feedback": feedback}

# ------------------------------------------------------------------ #
# 5. DATASET  — TODO: real button tasks pulled from git history.
# ------------------------------------------------------------------ #
trainset = [
    {
        "input": (
            "Add a 220ms scale-and-fade animation only when a new X or O is placed. "
            "Existing marks must not replay when another cell changes or when the board rerenders. "
            "Do not remount the entire board, and preserve the existing hover and focus behavior."
        ),
        "expected": {"case": "placement", "needs": ["scale", "fade", "animation", "timing"]},
    },
    {
        "input": (
            "Animate only newly placed X marks from rotate(-90deg) and scale(0.7) to their final "
            "state over 180ms. O marks must remain unchanged, and restarting the match must allow "
            "the animation to work again in a cell used during the previous round."
        ),
        "expected": {"case": "placement", "needs": ["rotate", "scale", "animation", "timing"]},
    },
    {
        "input": (
            "Give only newly placed O marks a 250ms opacity fade-in using a CSS transition. "
            "The fade must not replay on existing O marks after later moves, and X must still appear "
            "instantly. Do not add duplicate board state just to track the animation."
        ),
        "expected": {"case": "placement", "needs": ["fade", "transition", "timing"]},
    },
    {
        "input": (
            "Add a 300ms elastic scale placement animation for both marks, but respect "
            "prefers-reduced-motion by showing the final state immediately. Keep each cell keyboard "
            "accessible and do not remove its existing aria label, disabled logic, or focus styling."
        ),
        "expected": {"case": "placement", "needs": ["elastic", "scale", "animation", "timing"]},
    },
    {
        "input": (
            "Add a 160ms placement pop that combines scale and opacity without animating width, "
            "height, top, left, or other layout properties. It must not block pointer interaction, "
            "and the board itself must remain visually stationary."
        ),
        "expected": {"case": "placement", "needs": ["scale", "fade", "animation", "timing"]},
    },
    {
        "input": (
            "Highlight exactly the three winning cells with a one-time 350ms scale pulse. Reuse the "
            "existing winner calculation and WIN_LINES instead of implementing another winner checker "
            "inside Board or Cell. A draw must not receive any winning-cell class."
        ),
        "expected": {"case": "win_line", "needs": ["scale", "pulse", "animation", "timing"]},
    },
    {
        "input": (
            "Add a pulsing glow to the winning three cells for 2s, then leave a steady highlight. "
            "The effect must clear immediately when a new match starts and must not briefly reuse the "
            "previous round's winning indexes during reset."
        ),
        "expected": {"case": "win_line", "needs": ["pulse", "glow", "animation", "timing"]},
    },
    {
        "input": (
            "Draw a single animated overlay line through the centers of the winning three cells using "
            "stroke-dasharray and stroke-dashoffset. It must support all rows, columns, and both diagonals, "
            "stay aligned when the board resizes, and disappear on reset or draw."
        ),
        "expected": {"case": "win_line", "needs": ["stroke", "animation"]},
    },
    {
        "input": (
            "For diagonal victories only, add a moving-gradient shimmer to exactly the three winning "
            "cells. Horizontal and vertical wins should keep the existing appearance. Determine the win "
            "orientation from the existing winning combination rather than checking board coordinates twice."
        ),
        "expected": {"case": "win_line", "needs": ["shimmer", "animation"]},
    },
    {
        "input": (
            "When a player wins, animate the winning marks with a 400ms draw-on stroke effect while "
            "leaving non-winning marks unchanged. The implementation must work for both the X and O SVGs, "
            "must not mutate the board array, and must preserve the final visible stroke after animation."
        ),
        "expected": {"case": "win_line", "needs": ["stroke", "animation", "timing"]},
    },
    {
        "input": (
            "Add a bouncy placement animation that overshoots once and settles in 280ms. The animation "
            "must trigger only after a legal move; clicking an occupied or disabled cell must not retrigger "
            "any mark animation or alter match state."
        ),
        "expected": {"case": "placement", "needs": ["@keyframes", "bounce", "scale", "timing"]},
    },
    {
        "input": (
            "Add a 200ms rotate-and-fade placement animation, but keep the existing mark SVG transforms "
            "intact. Compose the animation transform safely so the X and O geometry does not shift, rotate "
            "incorrectly, or inherit animation from the cell container."
        ),
        "expected": {"case": "placement", "needs": ["rotate", "fade", "animation", "timing"]},
    },
    {
        "input": (
            "Add both placement and victory feedback: newly placed marks should scale in over 180ms, and "
            "the final winning three cells should pulse with a glow for 1.5s. Do not replay placement "
            "animations on old marks, do not animate draws, and include reduced-motion fallbacks for both effects."
        ),
        "expected": {"case": "win_line", "needs": ["scale", "pulse", "glow", "animation", "timing"]},
    },
]

valset = [
    {
        "input": (
            "Animate a newly placed mark from scale(0.6) and opacity 0 to its final state over 240ms. "
            "Previously placed marks must remain still during later turns, including after any parent rerender, "
            "and reduced-motion users should see the final state immediately."
        ),
        "expected": {"case": "placement", "needs": ["scale", "fade", "animation", "timing"]},
    },
    {
        "input": (
            "Animate only X on legal placement with a 190ms rotate-in transition from -120deg. Do not "
            "change O, do not retrigger X animations when occupied cells are clicked, and preserve all "
            "existing button accessibility and disabled behavior."
        ),
        "expected": {"case": "placement", "needs": ["rotate", "transition", "timing"]},
    },
    {
        "input": (
            "Add a responsive line overlay that draws across the winning combination in 500ms and works "
            "for rows, columns, and diagonals. Reuse the existing resolved winning line, avoid hard-coded "
            "pixel coordinates, and remove the overlay immediately on restart."
        ),
        "expected": {"case": "win_line", "needs": ["stroke", "animation", "timing"]},
    },
    {
        "input": (
            "On victory, glow only the three winning cells for 1.5s before settling to a static highlight. "
            "Draws must remain unhighlighted, reset must clear stale winner state, and prefers-reduced-motion "
            "must skip the pulse while retaining the final highlight."
        ),
        "expected": {"case": "win_line", "needs": ["pulse", "glow", "animation", "timing"]},
    },
    {
        "input": (
            "Add a 200ms placement scale animation and a separate 600ms winning-mark stroke animation. "
            "Only the latest mark should run placement feedback, only winning marks should run victory "
            "feedback, and neither effect may duplicate winner logic or break keyboard play."
        ),
        "expected": {"case": "win_line", "needs": ["scale", "stroke", "animation", "timing"]},
    },
]

# ------------------------------------------------------------------ #
# 6. SEED  — your CURRENT button instruction (the starting point).
# ------------------------------------------------------------------ #
seed = {
    "system_prompt": (
        "You are a front-end engineer updating a React tic-tac-toe board. "
        "The user will describe an animation to add (mark placement and/or winning-line highlight). "
        "You receive the current source files and must return the FULL updated code for every file "
        "you change — complete file contents, not diffs or snippets. "
        "Use CSS @keyframes, transition, or animation properties (or equivalent React inline styles) "
        "wired into the existing Board, Cell, MarkX, MarkO components and board.css. "
        "For placement animations, target the mark or cell elements. "
        "For win-line animations, expose winning cells or a win-line overlay from match state "
        "(use WIN_LINES from rules/board.js) and add a class plus animation on the winning line. "
        "Preserve all existing game logic and accessibility, honor exact requested timing and scope, "
        "and add prefers-reduced-motion handling for nonessential animation. Output only the updated code files, "
        "each preceded by a === path === header. No preamble or explanation."
    )
}

# ------------------------------------------------------------------ #
# 7. RUN IT  — optimize_anything drives the evolutionary loop.
# ------------------------------------------------------------------ #
def evaluate(candidate: dict, example: dict) -> float:
    outcome = metric(example, candidate)
    oa.log(outcome["feedback"])
    return outcome["score"]


if __name__ == "__main__":
    result = optimize_anything(
        seed_candidate=seed,
        evaluator=evaluate,
        dataset=trainset,
        valset=valset,
        objective=(
            "Evolve a system prompt that makes claude-haiku-4-5 produce higher-quality, "
            "more correct React/CSS implementations for tic-tac-toe placement and win-line "
            "animation tasks. Optimize exact requirement compliance, complete project integration, "
            "preservation of existing logic and accessibility, and robust production-quality code. "
            "Keep token usage in roughly the current range; do not optimize for shorter answers."
        ),
        config=GEPAConfig(
            engine=EngineConfig(max_metric_calls=10),
            reflection=ReflectionConfig(reflection_lm="anthropic/claude-sonnet-4-6"),
        ),
    )
    print("\n=== OPTIMIZED INSTRUCTION ===\n")
    best = result.best_candidate
    if isinstance(best, dict):
        print(best.get("system_prompt", best))
    else:
        print(best)
