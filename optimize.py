"""
GEPA instruction optimizer — tuned to cut DOLLAR cost, which automatically
prefers cheap input tokens over expensive output tokens.

WHAT RUNS WHEN YOU TYPE  `python optimize.py`:
  1. optimize_anything() picks a candidate instruction and runs your task on the trainset
  2. evaluate() -> metric() scores each result (quality minus a dollar-cost penalty)
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
# 1. PRICING  — this is what makes output cost more than input.
#    Haiku 4.5 = $1 / $5 per MILLION tokens. Output is 5x input.
#    Because the penalty is in real dollars, the optimizer treats one
#    output token as 5 input tokens and learns to prefer input.
# ------------------------------------------------------------------ #
PRICE_IN  = 1.0 / 1_000_000     # $ per input token
PRICE_OUT = 5.0 / 1_000_000     # $ per output token  (5x input)

COST_BUDGET   = 0.01            # target $ per task; tune to your workload
LAMBDA        = 0.5             # how hard to push on cost (0.1 gentle ... 1.0 aggressive)
QUALITY_FLOOR = 0.67            # syntax + animation hook clears; tighten to 1.0 later

def dollar_cost(input_tokens: int, output_tokens: int) -> float:
    return input_tokens * PRICE_IN + output_tokens * PRICE_OUT


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
def check_quality(output: str, example: dict) -> float:
    expected = example.get("expected", {})
    case = expected.get("case", "placement")
    score = 0.0

    if _syntax_ok(output):
        score += 0.34

    if _has_animation_hook(output, expected):
        score += 0.33

    if case == "win_line":
        if _has_win_line_treatment(output):
            score += 0.33
    elif case == "placement":
        if _has_placement_target(output, expected):
            score += 0.33

    return min(score, 1.0)


# ------------------------------------------------------------------ #
# 4. THE METRIC  — score steers selection, feedback steers the rewrite.
#    (You do NOT edit the loop; you only define this.)
# ------------------------------------------------------------------ #
def metric(example, candidate):
    result  = run_task(candidate["system_prompt"], example)
    quality = check_quality(result["output"], example)          # 0..1
    cost    = dollar_cost(result["input_tokens"], result["output_tokens"])

    # GATED: cheapness can NOT rescue a broken button. Quality is a floor.
    if quality < QUALITY_FLOOR:
        return {"score": quality - 1.0,   # firmly below any passing candidate
                "feedback": (f"FAILED quality gate (q={quality:.2f}). Fix correctness "
                             f"first; do not trim at the expense of tests/a11y.")}

    # Above the floor, the only way to score higher is to get CHEAPER.
    score = 1.0 - LAMBDA * (cost / COST_BUDGET)
    feedback = (
        f"passed. cost=${cost:.4f} (budget ${COST_BUDGET:.4f}). "
        f"input={result['input_tokens']} tok, output={result['output_tokens']} tok. "
        f"OUTPUT costs 5x input — cut output first: terse diffs not full-file rewrites, "
        f"drop reasoning preambles, push fixed conventions into the (cacheable) instruction."
    )
    return {"score": score, "feedback": feedback}

# ------------------------------------------------------------------ #
# 5. DATASET  — TODO: real button tasks pulled from git history.
# ------------------------------------------------------------------ #
trainset = [
    {
        "input": (
            "Add a pop-in scale animation when X or O is placed: marks should start at "
            "scale(0) and grow to full size over 200ms with an ease-out curve."
        ),
        "expected": {"case": "placement", "needs": ["@keyframes", "scale", "animation"]},
    },
    {
        "input": (
            "Animate mark placement with a fade-in: opacity goes from 0 to 1 over 250ms "
            "when a cell receives X or O."
        ),
        "expected": {"case": "placement", "needs": ["fade", "transition"]},
    },
    {
        "input": (
            "Add a bouncy placement animation for new marks using @keyframes so X and O "
            "overshoot slightly then settle."
        ),
        "expected": {"case": "placement", "needs": ["@keyframes", "bounce", "scale"]},
    },
    {
        "input": (
            "Rotate marks into place on click: each new X or O spins from -90deg to 0deg "
            "over 180ms."
        ),
        "expected": {"case": "placement", "needs": ["rotate", "animation"]},
    },
    {
        "input": (
            "Use a fast 120ms scale pop-in for placement — snappy and minimal, no bounce."
        ),
        "expected": {"case": "placement", "needs": ["scale", "timing", "animation"]},
    },
    {
        "input": (
            "Use a slow 400ms fade-in when marks appear; keep the board static otherwise."
        ),
        "expected": {"case": "placement", "needs": ["fade", "timing", "transition"]},
    },
    {
        "input": (
            "Animate only the X mark on placement with a green-tinted scale pop; leave O "
            "unchanged for now."
        ),
        "expected": {"case": "placement", "needs": ["scale", "animation"]},
    },
    {
        "input": (
            "Animate only the O mark with a soft fade-in on placement; X can appear instantly."
        ),
        "expected": {"case": "placement", "needs": ["fade", "transition"]},
    },
    {
        "input": (
            "When a player wins, draw an animated stroke along the winning three-in-a-row "
            "using stroke-dashoffset so the line appears to be drawn on."
        ),
        "expected": {"case": "win_line", "needs": ["@keyframes", "stroke", "animation"]},
    },
    {
        "input": (
            "Highlight the winning line with a pulsing glow: the three winning cells should "
            "pulse box-shadow or filter brightness on a loop."
        ),
        "expected": {"case": "win_line", "needs": ["pulse", "glow", "animation"]},
    },
    {
        "input": (
            "On win, add a win-line class to the three winning cells and animate them with "
            "a brief scale-up then settle."
        ),
        "expected": {"case": "win_line", "needs": ["scale", "animation"]},
    },
    {
        "input": (
            "For diagonal wins, shimmer across the winning cells with a moving gradient "
            "background animation."
        ),
        "expected": {"case": "win_line", "needs": ["shimmer", "animation"]},
    },
    {
        "input": (
            "Placement should use an elastic ease scale from 0.6 to 1.0 over 300ms when "
            "either mark is played."
        ),
        "expected": {"case": "placement", "needs": ["elastic", "scale", "animation"]},
    },
]

valset = [
    {
        "input": (
            "Pop-in scale on placement at 220ms with ease-out-back for both X and O marks."
        ),
        "expected": {"case": "placement", "needs": ["scale", "animation", "timing"]},
    },
    {
        "input": (
            "Rotate-in placement: marks spin from 180deg to 0deg over 200ms with a CSS "
            "transition on transform."
        ),
        "expected": {"case": "placement", "needs": ["rotate", "transition"]},
    },
    {
        "input": (
            "Winning row: animate an SVG or overlay line that draws across the three cells "
            "using stroke-dasharray and stroke-dashoffset."
        ),
        "expected": {"case": "win_line", "needs": ["stroke", "animation"]},
    },
    {
        "input": (
            "On victory, pulse a golden glow on the winning line cells for 2s before holding "
            "a steady highlight."
        ),
        "expected": {"case": "win_line", "needs": ["pulse", "glow", "animation"]},
    },
    {
        "input": (
            "Win-line treatment: add winning-line styling and a scale pulse on the three "
            "cells in the winning combination."
        ),
        "expected": {"case": "win_line", "needs": ["scale", "pulse", "animation"]},
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
        "Preserve all existing game logic and accessibility. Output only the updated code files, "
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
            "Evolve a system prompt that instructs claude-haiku-4-5 to add tic-tac-toe "
            "placement and win-line animations to React/CSS source while keeping outputs "
            "cheap (minimal tokens) and passing objective quality checks."
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
