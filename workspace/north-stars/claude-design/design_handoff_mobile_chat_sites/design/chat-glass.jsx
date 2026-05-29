// Glass-mode chat templates: transparent over a backdrop, keyboard up, idle state.

// ─── The backdrop ──────────────────────────────────────────
// Atmospheric warm gradient mesh — a placeholder for whatever
// the user wants to show through. Designed to make glass POP:
// strong color variation, soft blobs that read clearly when blurred.
function Backdrop() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* base wash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, #F5D5BF 0%, #E8A584 30%, #C97A6A 60%, #6B4A6E 100%)',
      }}/>
      {/* color blobs to add depth */}
      <div style={blob(-80, -40, 320, '#FFD6B0', 0.85)}/>
      <div style={blob(260, 120, 280, '#E07B5B', 0.7)}/>
      <div style={blob(-60, 380, 260, '#F4A989', 0.65)}/>
      <div style={blob(220, 520, 300, '#5A3D6E', 0.55)}/>
      <div style={blob(60, 700, 360, '#D9648A', 0.45)}/>
      {/* faint grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.9'/></svg>")`,
        mixBlendMode: 'overlay',
      }}/>
    </div>
  );
}
const blob = (x, y, size, color, opacity) => ({
  position: 'absolute', left: x, top: y, width: size, height: size,
  borderRadius: '50%', background: color, opacity,
  filter: 'blur(60px)', pointerEvents: 'none',
});

// ─── Glass primitives ──────────────────────────────────────
const glassLight = {
  background: 'rgba(255,250,245,0.32)',
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: '0.5px solid rgba(255,255,255,0.45)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(40,20,10,0.10)',
};
const glassCoral = {
  background: 'rgba(217,119,87,0.42)',
  backdropFilter: 'blur(24px) saturate(200%)',
  WebkitBackdropFilter: 'blur(24px) saturate(200%)',
  border: '0.5px solid rgba(255,200,170,0.55)',
  boxShadow: 'inset 0 1px 0 rgba(255,235,220,0.45), 0 2px 8px rgba(120,40,20,0.15)',
};
const glassChip = {
  background: 'rgba(255,250,245,0.22)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '0.5px solid rgba(255,255,255,0.4)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
};

// ─── Glass header ──────────────────────────────────────────
function GlassHeader() {
  return (
    <div style={{
      paddingTop: 56, padding: '56px 14px 10px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', zIndex: 5,
      ...glassLight,
      borderRadius: 0, borderBottom: '0.5px solid rgba(255,255,255,0.35)',
    }}>
      <GlassPillBtn>{Icon.sidebar(20, '#fff')}</GlassPillBtn>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 13px', borderRadius: 999,
        ...glassChip,
        fontFamily: UI_FONT, fontSize: 13.5, fontWeight: 600, color: '#fff',
        textShadow: '0 1px 1px rgba(0,0,0,0.12)',
      }}>
        <ClaudeMark size={13} color="#fff"/>
        Sonnet 4.5
        {Icon.chevDown(11, 'rgba(255,255,255,0.85)')}
      </div>
      <GlassPillBtn>{Icon.more(20, '#fff')}</GlassPillBtn>
    </div>
  );
}

function GlassPillBtn({ children, size = 36 }) {
  return (
    <button style={{
      width: size, height: size, borderRadius: 999, padding: 0, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...glassChip,
    }}>{children}</button>
  );
}

// ─── Glass messages ─────────────────────────────────────────
function GUserMsg({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 16px' }}>
      <div style={{
        maxWidth: '76%',
        padding: '10px 14px', borderRadius: 20, borderBottomRightRadius: 6,
        ...glassCoral,
        color: '#fff',
        fontFamily: UI_FONT, fontSize: 15.5, lineHeight: 1.4,
        textShadow: '0 1px 1px rgba(120,40,20,0.18)',
      }}>{children}</div>
    </div>
  );
}

// Claude messages: NO bubble — serif text floating on backdrop.
// Subtle text-shadow keeps it legible against any backdrop.
function GClaudeMsg({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'flex-start' }}>
      <div style={{ paddingTop: 4 }}><ClaudeMark size={16} color="#fff"/></div>
      <div style={{
        flex: 1, color: '#fff',
        fontFamily: SERIF, fontSize: 17, lineHeight: 1.5, letterSpacing: -0.1,
        textShadow: '0 1px 2px rgba(30,15,5,0.25), 0 0 18px rgba(30,15,5,0.15)',
      }}>{children}</div>
    </div>
  );
}

// glass card embedded inside a Claude message (for drafts etc)
function GDraftCard({ children }) {
  return (
    <div style={{
      marginTop: 10, padding: 12, borderRadius: 14,
      ...glassLight,
      fontFamily: UI_FONT, fontSize: 13.5, lineHeight: 1.5,
      color: '#fff',
      textShadow: '0 1px 1px rgba(0,0,0,0.15)',
    }}>{children}</div>
  );
}

// ─── Conversation content (idle — no recording) ──────────────
function GlassConvo({ trailingChips }) {
  return (
    <>
      <GClaudeMsg>Happy to help — what's on your mind?</GClaudeMsg>
      <GUserMsg>Draft a follow-up to Sarah about Tuesday's design review.</GUserMsg>
      <GClaudeMsg>
        Here's a first pass — warm but concise:
        <GDraftCard>
          <div style={{ opacity: 0.75, fontSize: 11.5, marginBottom: 4, letterSpacing: 0.2 }}>
            SUBJECT · Following up on Tuesday's review
          </div>
          Hi Sarah — thanks again for walking us through the new flows on Tuesday.
          The onboarding sketches especially felt like a real step forward.
          A couple of small thoughts before Friday…
        </GDraftCard>
        {trailingChips}
      </GClaudeMsg>
    </>
  );
}

// ─── Variation 1 · ACTION RAIL · idle, glass, keyboard up ────
function GlassActionRail() {
  return (
    <div style={glassScreen}>
      <GlassHeader/>
      <div style={glassScroll}><GlassConvo/></div>
      <div style={{ padding: '8px 10px 10px', position: 'relative', zIndex: 3 }}>
        <div style={{
          ...glassLight, borderRadius: 26, padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* text row */}
          <div style={{
            fontFamily: UI_FONT, fontSize: 15.5, color: 'rgba(255,255,255,0.78)',
            padding: '4px 4px 8px',
            textShadow: '0 1px 1px rgba(0,0,0,0.15)',
          }}>Reply to Claude…</div>
          {/* action rail */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            borderTop: '0.5px solid rgba(255,255,255,0.3)', paddingTop: 10,
          }}>
            <RailBtn>{Icon.plus(19, '#fff')}</RailBtn>
            <RailBtn>{Icon.camera(19, '#fff')}</RailBtn>
            <RailBtn>{Icon.envelope(17, '#fff')}</RailBtn>
            <div style={{ flex: 1 }}/>
            <RailBtn>{Icon.mic(19, '#fff')}</RailBtn>
            <button style={{
              width: 38, height: 38, borderRadius: 999, border: 'none', padding: 0,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.92)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.15)',
            }}>{Icon.arrowUp(16, C.coralDeep)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailBtn({ children }) {
  return (
    <button style={{
      width: 38, height: 38, borderRadius: 999, padding: 0, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...glassChip,
    }}>{children}</button>
  );
}

// ─── Variation 2 · TOOL ROW · idle, glass, keyboard up ───────
function GlassToolRow() {
  return (
    <div style={glassScreen}>
      <GlassHeader/>
      <div style={glassScroll}><GlassConvo/></div>
      <div style={{ padding: '8px 10px 10px', position: 'relative', zIndex: 3 }}>
        <div style={{
          ...glassLight, borderRadius: 26, padding: '12px 14px',
        }}>
          <div style={{
            fontFamily: UI_FONT, fontSize: 15.5, color: 'rgba(255,255,255,0.78)',
            padding: '4px 2px 12px',
            textShadow: '0 1px 1px rgba(0,0,0,0.15)',
          }}>Make it warmer, and ask about timing.</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            borderTop: '0.5px solid rgba(255,255,255,0.3)', paddingTop: 10,
          }}>
            <GlassToolBtn icon={Icon.paperclip(15, '#fff')} label="Attach"/>
            <GlassToolBtn icon={Icon.envelope(15, '#fff')} label="Email"/>
            <GlassToolBtn icon={Icon.mic(15, '#fff')} label="Voice"/>
            <div style={{ flex: 1 }}/>
            <button style={{
              width: 38, height: 38, borderRadius: 999, border: 'none', padding: 0,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.92)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.15)',
            }}>{Icon.arrowUp(16, C.coralDeep)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassToolBtn({ icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '7px 10px', borderRadius: 999, cursor: 'pointer',
      ...glassChip,
      fontFamily: UI_FONT, fontSize: 12.5, fontWeight: 600, color: '#fff',
      textShadow: '0 1px 1px rgba(0,0,0,0.15)',
    }}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ─── Variation 3 · COMBO · single composer, inline mini-rail ─
// Pulls the most-used three (email, mic, send) into a single horizontal
// strip with the input. Tap "+" to reveal the full tool row above.
function GlassCombo() {
  return (
    <div style={glassScreen}>
      <GlassHeader/>
      <div style={glassScroll}>
        <GlassConvo trailingChips={
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <GChip icon={Icon.envelope(13, '#fff')} label="Send via email"/>
            <GChip label="Warmer"/>
            <GChip label="Shorten"/>
          </div>
        }/>
      </div>
      <div style={{ padding: '8px 10px 10px', position: 'relative', zIndex: 3 }}>
        <div style={{
          ...glassLight, borderRadius: 999, padding: '6px 6px 6px 8px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <RailBtn>{Icon.plus(19, '#fff')}</RailBtn>
          <div style={{
            flex: 1, fontFamily: UI_FONT, fontSize: 15.5,
            color: 'rgba(255,255,255,0.78)',
            textShadow: '0 1px 1px rgba(0,0,0,0.15)',
            padding: '4px 2px',
          }}>Reply to Claude…</div>
          <RailBtn>{Icon.envelope(17, '#fff')}</RailBtn>
          <RailBtn>{Icon.mic(19, '#fff')}</RailBtn>
          <button style={{
            width: 38, height: 38, borderRadius: 999, border: 'none', padding: 0,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.15)',
          }}>{Icon.arrowUp(16, C.coralDeep)}</button>
        </div>
      </div>
    </div>
  );
}

function GChip({ icon, label }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 10px', borderRadius: 999,
      ...glassChip,
      fontFamily: UI_FONT, fontSize: 12.5, fontWeight: 600, color: '#fff',
      textShadow: '0 1px 1px rgba(0,0,0,0.15)',
    }}>{icon}{label}</div>
  );
}

const glassScreen = {
  height: '100%', display: 'flex', flexDirection: 'column',
  position: 'relative',
};
const glassScroll = {
  flex: 1, overflow: 'hidden', paddingBottom: 6,
};

Object.assign(window, {
  Backdrop, GlassActionRail, GlassToolRow, GlassCombo,
});
