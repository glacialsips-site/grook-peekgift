# Builder Shell — Component + Interaction Spec

_Distilled (by analysis agent) from `workspace/north-stars/claude-design/design_handoff_mobile_chat_sites/design/` (ios-frame, chat-shared, chat-live, chat-live-docked, chat-glass, chat-keyboard, chat-templates, live-preview, product-preview) + README. All values are literal design targets. **Recreate via tokens/components — do NOT copy the inline-styled prototype JSX.**_

## 0. Source-of-truth composition
```
IOSDevice  backdrop={<LivePreview/> | <ProductPreview/>}
  └─ children = <LiveChat/>          ← keyboard-UP state
                <LiveChatDocked/>    ← keyboard-DOWN state
```
Backdrop (the site being built) and chat overlay are **siblings in one device frame**, stacked by z-index. Chat never contains the preview; it floats over it. In production the backdrop slot is the **Site-IR renderer**, not a prototype preview.

## 1. Component tree
```
<BuilderShell>                       // owns keyboardUp state + theme tokens
  <IOSDevice>                        // device chrome; props: width,height,dark,backdrop
    ├─ <PreviewBackdrop/>            // z0  — the live site (IR renderer in prod)
    ├─ <DynamicIsland/>              // z50 — static pill
    ├─ <StatusBar/>                  // z10 — time + signal/wifi/battery
    ├─ <ShellBody>                   // z1  — flex column, height:100%
    │    ├─ <GlassHeader/>           // z5  — back/sidebar · model pill · more
    │    ├─ {keyboardUp ? <MessageStream/> : <Spacer/>}
    │    ├─ {keyboardUp && <InputPill/>}     // z4
    │    └─ {keyboardUp ? <Keyboard/> /*z15*/ : <DockPill/> /*z4*/}
    └─ <HomeIndicator/>              // z60 — pointer-events:none
```

### Z-index contract (this is what makes glass read)
| Layer | z | Notes |
|---|---|---|
| PreviewBackdrop | **0** | `position:absolute; inset:0`. Everything blurs through this. |
| ShellBody | 1 base | `position:relative` flex column |
| GlassHeader | 5 | |
| InputPill / DockPill | 4 | |
| StatusBar | 10 | |
| Keyboard | 15 | |
| DynamicIsland | 50 | |
| HomeIndicator | 60 | top of everything |

Backdrop at z0 + translucent fills at z1–15 is the whole trick: `backdrop-filter` samples live preview pixels. No separate blur image — glass blurs live pixels.

## 2. Phone frame — `IOSDevice`
- Canvas `402×874` (artboards pad to `442×914`); corner radius **48**, `overflow:hidden`.
- BG fallback `#F2F2F7` light / `#000` dark. Outer shadow `0 40px 80px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.12)`.
- **Dynamic Island:** `126×37`, radius 24, top 11, centered, solid `#000`, z50.
- **Status bar:** top, z10, `padding 21px 24px 19px`, time `9:41` SF weight 590 `17/22`, inline-SVG signal/wifi/battery. `#000` light / `#fff` dark.
- **Home indicator:** bottom, z60, `pointer-events:none`. Pill `139×5`, radius 100, `rgba(0,0,0,.25)` / `rgba(255,255,255,.7)` dark.
- **Backdrop slot:** `<div position:absolute; inset:0; zIndex:0>` — load-bearing; live site blurs through header/input/keyboard/dock.
- **Prod:** replace fixed dims with real viewport + `env(safe-area-inset-*)`; OS draws island/home-indicator. Keep the **z-layering + backdrop slot** — that's the architecture, not the bezel.

## 3. Glass header — `GlassHeader` (canonical = live-over-preview `LiveHeader`)
- `padding: 56px 14px 8px` (56 clears status bar + island), flex space-between center.
- Top-fade glass: `background: linear-gradient(180deg, rgba(255,250,245,.28) 0%, rgba(255,250,245,0) 100%)`, `backdrop-filter: blur(8px)`. No border.
- Buttons (`liveHdrBtn`) `34×34` r999, `rgba(30,20,15,.38)`, `blur(16px) saturate(180%)`, border `.5px rgba(255,255,255,.22)`, `inset 0 1px 0 rgba(255,255,255,.2)`. Lead=sidebar 20px #fff; trail=more 20px #fff.
- **Model pill:** `padding 6px 11px` r999, `rgba(30,20,15,.42)`, `blur(20px) saturate(180%)`, border `.5px rgba(255,255,255,.25)`, inset shine. = ClaudeMark 12 #fff + "Sonnet 4.5" (SF 12.5/600 #fff, `text-shadow 0 1px 1px rgba(0,0,0,.4)`) + chevron-down 10px.
- Solid variant `ChatHeader` (no preview behind): `#FAF7F2`, `border-bottom .5px #EFEAE0`, white model pill. Ship one `<Header variant="glass"|"solid">`.
- Hit-area ≥ **44px** around the 34–36px glass circles.

## 4. Message stream — `MessageStream`
Wrapper `position:relative; flex:1; minHeight:0` holding a fixed `SmokeFilm` + an absolute scroller.
- **Scroller:** `position:absolute; inset:0; overflow-y:auto`, `padding-top:60; padding-bottom:8`. Top fade-in mask: `mask-image: linear-gradient(to bottom, transparent 0px, rgba(0,0,0,.15) 30px, rgba(0,0,0,.55) 90px, #000 150px)`. **Auto-scroll to bottom on mount** + as tokens stream.
- **SmokeFilm** (two stacked `aria-hidden` `pointer-events:none` layers):
  1. Tonal floor: `linear-gradient(180deg, transparent 0%, transparent 18%, rgba(14,8,5,.30) 38%, rgba(14,8,5,.55) 70%, rgba(14,8,5,.62) 100%)`
  2. Blur: `backdrop-filter: blur(22px) saturate(140%)` masked by `linear-gradient(180deg, transparent 0%, transparent 12%, #000 38%, #000 100%)`
  → text legible over any backdrop, no hard rectangles.
- **Claude msg `LClaudeMsg`** (over preview): no bubble, `flex; gap:10; padding:10px 16px; align-items:flex-start`. Lead `ClaudeMark 15 #fff`. Text **SERIF 16.5px / 1.45**, `-0.1`ls, `#fff`, `text-shadow 0 1px 1px rgba(0,0,0,.55), 0 0 14px rgba(0,0,0,.35)`. (Over solid: ink `#1F1E1D`, no shadow, coral mark.)
- **User msg `LUserMsg`** (glass bubble): right-aligned, `max-width:78%`, `padding:8px 13px`, radius 18 (BR 6), fill `rgba(217,119,87,.78)`, `blur(18px) saturate(180%)`, border `.5px rgba(255,210,180,.55)`, `inset 0 1px 0 rgba(255,235,220,.4), 0 1px 4px rgba(120,40,20,.18)`. Text SF 15/1.4 #fff. (Solid variant: opaque `coralWash #F4E4D8`, ink, r20/6.)
- **Draft card** (inline generated copy): r14 p12. Glass `rgba(255,250,245,.32)`, `blur(28px) saturate(180%)`, border `.5px rgba(255,255,255,.45)`, white 13.5/1.5. Solid `#FFF`, `.5px #E8E1D5`, ink 14/1.45.

## 5. Input pill — `InputPill` (`LiveInput`)
Between stream + keyboard, z4, `padding: 6px 12px 8px`. Pill flex `gap:8; padding:8px 8px 8px 14px`, r999, fill `rgba(255,250,245,.28)`, `blur(24px) saturate(180%)`, border `.5px rgba(255,255,255,.5)`, `inset 0 1px 0 rgba(255,255,255,.4), 0 4px 14px rgba(40,20,10,.1)`. Field SF 15.5; placeholder **"Tell Claude what to change…"** at `rgba(255,255,255,.7)`. Send btn `34×34` r999 `rgba(255,255,255,.92)`, arrowUp 14px **`#BF5A3D`**.
> Richer composer studies (chat-glass action rail, chat-templates A–E) = a variant library. Live-shell default = thin pill + tools moved into the keyboard accessory bar (§7).

## 6. Two states + transition (single boolean `keyboardUp`)
- **A — keyboard UP (`LiveChat`):** Header → MessageStream → InputPill → Keyboard.
- **B — docked (`LiveChatDocked`):** Header → empty flex:1 spacer → DockPill (site shows through whole).
- **DockPill:** wrapper `padding 8px 14px 22px` z4. Pill `gap:10; padding:10px 8px 10px 16px` r999, fill `rgba(255,250,245,.28)`, **`blur(28px) saturate(180%)`** (heaviest), border `.5px rgba(255,255,255,.5)`, `inset 0 1px 0 rgba(255,255,255,.4), 0 8px 24px rgba(40,20,10,.18)`. = ClaudeMark 16 #fff + "Ask Claude to refine…" (SF 15 `rgba(255,255,255,.85)`) + envelope(17) + mic(18) `DockBtn`s (`36×36` r999 `rgba(255,255,255,.22)` `blur(8px)`).
- **Transition:** prototype hard-swaps; production animates — dock `translateY(140%→0)` `.45s cubic-bezier(.3,.8,.2,1)`; keyboard `~.35s` ease-out; raise re-mounts stream + auto-scrolls. Trigger = real keyboard focus/blur OR dock tap. Header + smoke persist across both. Honor `prefers-reduced-motion` (cross-fade).

## 7. iOS keyboard (canonical = `ChatKeyboard`, tools in accessory bar)
- Container z15 r27 `padding 10px 0 8px`. Warm glass `rgba(255,250,245,.20)`, `blur(28px) saturate(180%)`, `border-top .5px rgba(255,255,255,.5)`, `inset 0 1px 0 rgba(255,255,255,.5)`.
- **Tool accessory bar replaces autocorrect strip** (space-saving thesis): plus · paperclip · camera · envelope · spacer · mic. `KbdTool` `38×38` circle `rgba(255,255,255,.22)` `blur(8px)` white ~19px.
- QWERTY: keys `height 42` r8.5 `rgba(255,255,255,.32)` `blur(8px)`, glyphs SF Compact ~22px/460 #fff. Rows q-p / a-l(pad 20) / shift(42)+z-m+delete(42) / 123(56)+globe(42)+space+**return(86, `#D97757`, #fff ↵)**.
- `IOSKeyboard` (system ref, neutral surfaces): real autocorrect bar, **blue `#08f` return**. Use only when simulating raw iOS.

## 8. "Being-built" provenance (unify into one `<Provenance>` with theme-driven accent)
- **(a) chip:** `NEW` (`top:-8,right:10`, p`2px 7px`, r999, accent bg, #fff 10/700, ls.5) / `JUST PLACED` (`bottom:8,left:8`, `#A86B3E` bg, #fff 8.5/700, ls1.2, leading 4×4 white dot).
- **(b) breathing ring** on the just-placed element — `rcardIn` keyframe:
  ```css
  @keyframes rcardIn {
    0%   { box-shadow: 0 0 0 3px rgba(122,139,111,0.40), 0 6px 18px rgba(122,139,111,0.18); }
    100% { box-shadow: 0 0 0 6px rgba(122,139,111,0.10), 0 6px 18px rgba(122,139,111,0.18); }
  }
  /* animation: rcardIn 1.6s ease-out infinite alternate; */
  ```
  (product-preview variant: `outline 1.5px #A86B3E` + `box-shadow 0 0 0 4px rgba(168,107,62,.18)`, static.)
- **(c) section ping** `Ping`: inline pill `padding 3px 7px 3px 6px` r999 `rgba(168,107,62,.12)` border `.5px rgba(168,107,62,.35)`, text **"updated by claude"** 9.5px ls1.6 `#A86B3E`, leading 5×5 dot w/ halo.
- **Prod behavior:** IR mutation engine reports changed/added node → renderer wraps it transiently (chip + breathing ring; section-level → `Ping` on heading) → decays. Accent from active **theme tokens** (not hardcoded sage/terracotta). Do NOT port the `?cc=` deep-link hook (screenshot rig); the trigger is the mutation event.

## 9. Tokens
**Shell palette** (`chat-shared` `C`): cream `#FAF7F2` · surface `#FFFFFF` · ink `#1F1E1D` · muted `#6B6862` · faint `#9C988F` · border `#E8E1D5` · borderSoft `#EFEAE0` · coral `#D97757` · coralDeep `#BF5A3D` · coralWash `#F4E4D8` · coralTint `#FBEFE6` · canvas `#1A1518` (letterbox only). Preview accents (sage `#7A8B6F`, terracotta `#A86B3E`) come from the **site theme**, never the shell.

**Glass recipes** (blur scales with isolation): header `blur(8)` · header btns `blur(16) sat180` · model pill `blur(20) sat180` · user bubble `blur(18) sat180` · input `blur(24) sat180` · keyboard slab `blur(28) sat180` · keys `blur(8)` · dock `blur(28) sat180` · smoke `blur(22) sat140`. Formula: `blur(8–28px) saturate(140–180%)` + translucent warm-white/coral fill + `.5px` white border + `inset 0 1px 0` shine. Always pair `-webkit-backdrop-filter`; fallback raises fill opacity.

**Type:** Sans `-apple-system,"SF Pro Text",system-ui`. Serif (Claude voice + site display) `"Source Serif 4","Tiempos Text","Iowan Old Style",Georgia` (Google opsz 8..60, w 400/500/600/700). Claude msg serif 16.5/1.45 -0.1ls; user 15/1.4; model pill 12.5/600; large title 34/700; list row 17 -0.43ls.

**Motion:** dock `translateY(140%→0)` `.45s cubic-bezier(.3,.8,.2,1)`; keyboard `translateY(100%↔0)` `~.35s ease-out`; ring `rcardIn 1.6s ease-out infinite alternate`; scrims `.35s ease`; (site parity) sheet `translateY(101%→0)` `.45s cubic-bezier(.3,.85,.2,1)`, menu `translateX(100%→0)` `.4s cubic-bezier(.3,.8,.2,1)`.

**Geometry/a11y:** radii device 48 · keyboard 27 · cards 14–26 · sheet-top 22 · user bubble 18/6 · pills 999 · keys 8.5. Safe areas → real `env(safe-area-inset-*)`. Touch targets ≥ 44px.

## 10. Overlay summary
1. IOSDevice renders the live site into z0 backdrop slot (prod = Site-IR renderer). 2. Chat ShellBody is a sibling at z1+, transparent except glass. 3. Every glass surface `backdrop-filter`s the live pixels beneath (live blur-through, not snapshot). 4. SmokeFilm darkens/blurs locally + per-message text-shadow → legible white serif over any site, no bubbles. 5. Island/status/home-indicator float above (sim chrome). 6. keyboard-up → lower screen covers ~60% preview (stays legible); keyboard-down → empties to dock pill, site whole.

**Cautions:** tokens not literals; `ClaudeMark` 4-bar asterisk = placeholder, swap official brand; icons → proper component set; `design-canvas` + `?cc=` + sim chrome = prototype rigs, not product; preview accents belong to the generated site theme, never the shell (shell is always warm-cream/coral/Source-Serif).
