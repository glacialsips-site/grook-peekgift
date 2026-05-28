# MEMORY — read this first, every wake-up

This is your INDEX. It triggers what to pull. It doesn't carry knowledge — it carries pointers. Trust the pointers; don't try to remember the content.

## Hard rules (the only knowledge that earns its bytes here)

1. **Never say to Frank**: "you're right", "good catch", "great point", "great question", "I apologize", "sorry for the confusion", "absolutely", "of course", "definitely", "I completely understand". Frank tracks. Drift = wasted context arguing about behavior instead of building.
2. **Batch deploys.** Never push to `atelier-integration` per-fix. Spawn parallel subs → all land → one push.
3. **Default model: `claude-sonnet-4-6`** (not Opus). Sonnet handles curator chat; Opus is opt-in per call for hard creative jobs only.
4. **No code comments** unless absolutely necessary. Comments = code smell = not perfect. If you keep one, justify in commit message.
5. **Never echo secrets** to Frank in chat. MCP reads/writes only.
6. **Never touch legacy `peek.gift` apex (Vite) or `glacialsips.com`** without explicit Frank confirmation. They share keys.
7. **Mobile-first. Custom UI everywhere.** No Clerk/Stripe branded UI visible.
8. **Trust verified state over training.** WebFetch live docs on `platform.claude.com` before claiming an API shape.

## Triggers — read these when you need to know:

| If you need to know… | Trigger |
|---|---|
| What peek.gift is | `_packets/BRAIN-DUMP.md` (Frank's voice — read once for tone) |
| Current product spec | `_packets/SPINE/README.md` (then the 5 spine docs it lists) |
| What's deployed RIGHT NOW | `git log --oneline -10 atelier-integration` + curl `https://vnext.peek.gift/` |
| What's broken | `_packets/BUGS-WAVE2.md` + `_packets/BUGS-WAVE2-FOLLOWUPS.md` + `_packets/BUGS-CHAT-LOOP.md` (if exists) |
| Frank's open todos | `_packets/SPINE/FRANK-TODO.md` |
| What services are keyed | `_packets/SPINE/SERVICES.md` |
| Verified ground truth (MCP-pulled) | `_packets/SPINE/VERIFIED-STATE.md` |
| Peek's system prompt | `_packets/SPINE/CURATOR_PROMPT.md` (the `## THE PROMPT` block is the literal text) |
| Every tool Peek can call | `_packets/SPINE/TOOL_MANIFEST.md` |
| The peek.gift apex cutover plan | `_packets/SPINE/CUTOVER.md` |
| If a sub mentioned a packet number | `_packets/40-*` / `_packets/41-*` / `_packets/_archive/integrated-packets/NN-*` |
| Things you EXCLUDED (don't reconsider unless Frank says) | `_packets/SPINE/IDEAS-LATER.md` |
| Deep-dive on this whole session | `_packets/HANDOFF-NEXT-FRAME.md` (only if pointers above aren't enough) |

## Triggers — read these BUT DISMISS:

| Don't reload | Why |
|---|---|
| `_packets/_archive/AUDIT.md` | Stale, 36k of noise |
| `_packets/_archive/ORCHESTRATOR-NOTES.md` | Old session's confusion |
| `_packets/_archive/COMMENTS.md` | Low-value comment log |
| `_packets/_archive/integrated-packets/*` | History only, packets 01-35 already merged |
| `_packets/CONCEPT-INVENTORY.md` | Superseded by VERIFIED-STATE + LIVE-STATE-SMOKE |
| `_packets/ANTHROPIC-API-CONTEXT.md` | Mostly superseded by SPINE/CAPABILITY_INVENTORY; useful for cost math only |

## After wake-up, ALWAYS:

1. Read this file (you just did).
2. `git log --oneline -10` on `claude/bold-ride-Li5zK` — see what landed since the last frame.
3. `git status` — clean any sub-agent leaks (`git checkout -- atelier/` + `git clean -fd atelier/`).
4. Read STATE.md top section for "Current focus."
5. Reply to Frank: "Awake. Last deploy `<sha>`. Reading `<doc>`. Next: `<action>`."

## North star (the only product fact worth pinning)

peek.gift = chat-driven gift page builder. Curator chats with Peek (Sonnet 4.6) → Peek mutates the live preview (mutate-first-narrate-second) → curator pays $12 → recipient opens the link, sees a cinematic reveal (hero → name → note → cards) → picks under rules. Mobile-first. Custom UI everywhere. **Any moron from Instagram builds a shockingly good site in 5 minutes.**
