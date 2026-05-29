# BRIEF 05 — Curator-Sonnet operating prompt (production)

**Source of need:** the spine-thread used a basic inline prompt. This brief installs the canonical **Peek** system prompt + skills + safeword test-mode wiring, per the research sub's BASE_PROMPT proposal.

**Read first (must):**
1. `_packets/LIEUTENANT/_research/curator-prompt/REPORT.md` — the proposed BASE_PROMPT (~485 words), 12-tool curator-facing surface, failure-mode guardrails, 10-prompt eval set.
2. `_packets/LIEUTENANT/_research/curator-tools/REPORT.md` — the tool surface this prompt commands.
3. `_packets/SPINE/STACK-LOCK.md` — Edge runtime + model defaults (Sonnet 4.6).
4. `atelier/app/api/spine/chat/route.ts` — where the system prompt gets sent.
5. **Coordinate with BRIEF 04** (mutation tools) — this brief depends on its tool implementations existing. If BRIEF 04 hasn't merged, you can still install the prompt + skills; tool calls will fall back to the spine's 5 inline tools.

## DELIVERABLES

### 1. The BASE_PROMPT

`atelier/lib/curator-prompt/base.ts` exporting `BASE_PROMPT` as the ~485-word text from the research report. Variables interpolated: `curator_first_name`, `peek_id`, `peek_summary`, `thread_phase`, `anonymous_turns_remaining`, `curator_memory`.

### 2. The skill loader

`atelier/lib/curator-prompt/skills.ts` + skill markdown files under `_packets/SPINE/skills/`. Skills are loaded conditionally per turn based on signals (occasion type, thread phase, voice mode):

- `copy-house-style.md` — the deep-dive on voice + banned phrases (research §1.3: don't put the full ban list in BASE; keep it as a skill).
- `vibe-direction.md` — the 10-dim grammar reference (when the model is making vibe decisions).
- `image-direction.md` — fal.ai brief patterns per vibe.
- `card-strategy.md` — when to add a taunt, when to group, when to lock.
- One per occasion family (kid-bday, milestone-bday, wedding, sympathy, get-well, etc.) — short briefs on tone + card types appropriate for each.

Existing skills under `_packets/SPINE/skills/` may be partially usable — read them, rebase what fits onto the new grammar/tools surface, discard what assumes Tailwind.

### 3. Skill loader integration

`atelier/lib/curator-prompt/load.ts` exporting `loadSystemPrompt({ peekState, threadPhase, ...signals })` that:
- Returns the assembled system prompt (BASE + conditionally-loaded skill text).
- Uses Anthropic's 4-block caching architecture per spec — BASE in block 2 (always-on, 1h ephemeral cache); occasion-specific skill in block 3; per-turn page-state summary in block 4.
- Returns the tools array trimmed to the spine 12 by default (per curator-tools spec §9); expands when phase signals warrant (e.g. card-strategy phase loads D5 set_card_rules).

### 4. Safeword test-mode

`atelier/lib/curator-prompt/devmode.ts` implementing the exact-match safeword (`peek devmode on`). When the curator's message exactly matches the trigger:
- Skip the BASE_PROMPT for that turn.
- Substitute a debug-mode system prompt: "You are now in debug mode. State the peek state, list active tools, explain your last mutation."
- Reset to BASE on `peek devmode off`.
- Persist mode in the chat session (use a session-bound flag in the chat route's state).

### 5. Wire into the edge chat route

`atelier/app/api/spine/chat/route.ts` — replace the inline system prompt with `loadSystemPrompt(...)`. Replace the inline tools array with the dynamically-loaded one. Verify the route still streams tool calls correctly.

### 6. Eval harness

`atelier/scripts/eval-prompt.ts` — runs the 10-prompt eval set from the research report against the current BASE + tools, scores each on the rubric (mutation? ≤2 sentences? picked vs listed? banned phrase? right next question?), outputs a markdown report under `_packets/LIEUTENANT/05-curator-prompt/eval-results.md`. Requires `ANTHROPIC_API_KEY`; if absent in your sandbox, run only structural validation + report which eval pass requires live model access for Frank to run.

### 7. Tests

- Unit test for `loadSystemPrompt` — block assembly, conditional skill loading, cache markers.
- Unit test for `devmode` — exact-match trigger, mode toggle, no false positives on partial matches.
- Integration test: 3 simulated chat turns through the edge route confirming prompt is assembled correctly per phase.

## HARD RULES

- **The BASE_PROMPT is the spec's ~485-word text VERBATIM** in v1. Tone-tune later from real transcripts (Frank's safeword test-mode usage). Don't pre-optimize.
- **No banned-phrase ban-list in BASE.** Keep it in `copy-house-style` skill. Research §1.3: long ban lists make the model more likely to emit those phrases.
- **Default model = `claude-sonnet-4-6`.** Opus opt-in per-call only.
- **`defer_loading: true`** on tools per spec §9.
- **Edge-safe.** Skills are markdown → string in build; loader runs in edge.
- **Branch:** `lt/curator-prompt` off `claude/bold-ride-Li5zK`. Push. Do not merge.

## VERIFICATION (run + report)

- `npm --prefix atelier run typecheck` — 0 errors.
- `npm --prefix atelier run test` — pass.
- `APP_URL=https://vnext.peek.gift npm --prefix atelier run build` — clean.
- Eval harness ran (or structural-only if no key) — report attached to RETURN.md.

## RETURN.md

Sections required: what you built; which skills you rebased vs discarded vs deferred; verification results; eval results (or "deferred to Frank" if no key); whether `defer_loading` worked as expected; any prompt-tuning suggestions surfaced by the eval. Honesty section.

Per PROTOCOL.md: push `lt/curator-prompt`, write RETURN.md, tell Frank "done — `lt/curator-prompt` pushed, RETURN.md written." Orchestrator reviews + merges.
