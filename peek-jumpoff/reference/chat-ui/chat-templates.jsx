// Five mobile Claude chat templates exploring email + mic placement.

// shared chat content — picks a realistic moment: drafting an email + voice
function SampleConvo({ showDraft = true, lastClaude }) {
  return (
    <>
      <ClaudeMsg>
        Happy to help — what would you like to do today?
      </ClaudeMsg>
      <UserMsg>Help me write a follow-up to Sarah about Tuesday's design review.</UserMsg>
      <ClaudeMsg>
        Sure. Quick check — do you want it warm and casual, or a bit more formal? Here's a first pass:
        {showDraft && (
          <DraftCard>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Subject: Following up on Tuesday's review</div>
            Hi Sarah,<br/><br/>
            Thanks again for walking us through the new flows on Tuesday — the
            onboarding sketches especially felt like a real step forward. A
            couple of thoughts I wanted to share before Friday…
          </DraftCard>
        )}
        {lastClaude}
      </ClaudeMsg>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// A — Classic: mic inside composer, email tucked in ⋯
// ═══════════════════════════════════════════════════════════
function TemplateA() {
  return (
    <div style={screenBase}>
      <ChatHeader/>
      <div style={scrollArea}>
        <SampleConvo/>
        <div style={{ height: 12 }}/>
      </div>
      <div style={{ padding: '8px 12px 14px', background: C.cream }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.surface, border: `0.5px solid ${C.border}`,
          borderRadius: 24, padding: '6px 6px 6px 14px',
          boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
        }}>
          <button style={{ ...iconBtn, width: 30, height: 30 }}>{Icon.plus(20, C.muted)}</button>
          <div style={{
            flex: 1, fontFamily: UI_FONT, fontSize: 15.5,
            color: C.faint, padding: '8px 0',
          }}>Reply to Claude…</div>
          <button style={{ ...iconBtn, width: 36, height: 36 }}>{Icon.mic(20, C.ink)}</button>
          <button style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>{Icon.arrowUp(16)}</button>
        </div>
        <div style={{
          textAlign: 'center', fontFamily: UI_FONT, fontSize: 11,
          color: C.faint, marginTop: 8, letterSpacing: 0.2,
        }}>Tap ⋯ to email this thread</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// B — Tool row composer: email + mic are visible peers
// ═══════════════════════════════════════════════════════════
function TemplateB() {
  return (
    <div style={screenBase}>
      <ChatHeader/>
      <div style={scrollArea}>
        <SampleConvo/>
      </div>
      <div style={{ padding: '8px 12px 14px', background: C.cream }}>
        <div style={{
          background: C.surface, border: `0.5px solid ${C.border}`,
          borderRadius: 22, padding: '12px 14px',
        }}>
          <div style={{
            fontFamily: UI_FONT, fontSize: 15.5, color: C.faint,
            padding: '2px 0 10px',
          }}>Make it warmer, and ask about timing.</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            borderTop: `0.5px solid ${C.borderSoft}`, paddingTop: 10,
          }}>
            <ToolBtn icon={Icon.paperclip(17)} label="Attach"/>
            <ToolBtn icon={Icon.envelope(17, C.coral)} label="Email" emphasis/>
            <ToolBtn icon={Icon.mic(17)} label="Voice"/>
            <div style={{ flex: 1 }}/>
            <button style={{
              width: 38, height: 38, borderRadius: 999, border: 'none',
              background: C.coral, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(191,90,61,0.3)',
            }}>{Icon.arrowUp(18)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon, label, emphasis }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '6px 10px', borderRadius: 999,
      background: emphasis ? C.coralTint : 'transparent',
      border: emphasis ? `0.5px solid ${C.coralWash}` : `0.5px solid transparent`,
      fontFamily: UI_FONT, fontSize: 13, fontWeight: 500,
      color: emphasis ? C.coralDeep : C.muted,
      cursor: 'pointer',
    }}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// C — Inline action chips on Claude's message + floating mic FAB
// ═══════════════════════════════════════════════════════════
function TemplateC() {
  return (
    <div style={screenBase}>
      <ChatHeader/>
      <div style={scrollArea}>
        <SampleConvo lastClaude={
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Chip icon={Icon.envelope(14, C.coralDeep)} label="Send via email" primary/>
            <Chip label="Make it warmer"/>
            <Chip label="Shorten"/>
            <Chip label="Copy"/>
          </div>
        }/>
        <div style={{ height: 80 }}/>
      </div>
      <div style={{
        position: 'relative', padding: '8px 12px 14px', background: C.cream,
      }}>
        {/* floating mic FAB */}
        <button style={{
          position: 'absolute', right: 18, top: -28,
          width: 56, height: 56, borderRadius: 999, border: 'none',
          background: C.coral, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(191,90,61,0.35), 0 1px 2px rgba(0,0,0,0.08)',
        }}>{Icon.mic(22, '#fff')}</button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: C.surface, border: `0.5px solid ${C.border}`,
          borderRadius: 22, padding: '10px 14px',
          marginRight: 62,
        }}>
          <div style={{
            flex: 1, fontFamily: UI_FONT, fontSize: 15.5,
            color: C.faint,
          }}>Type a reply…</div>
          {Icon.plus(20, C.muted)}
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label, primary }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '6px 11px', borderRadius: 999,
      background: primary ? C.coralTint : C.surface,
      border: `0.5px solid ${primary ? C.coralWash : C.border}`,
      fontFamily: UI_FONT, fontSize: 13, fontWeight: 500,
      color: primary ? C.coralDeep : C.ink,
    }}>
      {icon}{label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// D — Voice-first: hero mic, email as orbit action
// ═══════════════════════════════════════════════════════════
function TemplateD() {
  return (
    <div style={screenBase}>
      <ChatHeader/>
      <div style={scrollArea}>
        <SampleConvo/>
      </div>
      <div style={{
        padding: '14px 16px 20px', background: C.cream,
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 14,
      }}>
        {/* live recording visualization shown above mic */}
        <div style={{
          alignSelf: 'center',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px', borderRadius: 999,
          background: C.surface, border: `0.5px solid ${C.border}`,
          fontFamily: UI_FONT, fontSize: 12.5, color: C.muted,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999, background: C.coral,
            boxShadow: `0 0 0 4px ${C.coralTint}`,
          }}/>
          Tap to speak · or type below
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {/* secondary: email */}
          <button style={orbitBtn}>
            {Icon.envelope(22, C.ink)}
          </button>
          {/* hero: mic */}
          <button style={{
            flex: 1, height: 64, borderRadius: 999, border: 'none',
            background: `linear-gradient(180deg, ${C.coral}, ${C.coralDeep})`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 6px 20px rgba(191,90,61,0.32), inset 0 1px 0 rgba(255,255,255,0.2)',
            color: '#fff', fontFamily: UI_FONT, fontSize: 15, fontWeight: 600,
          }}>
            {Icon.mic(22, '#fff')}
            Hold to speak
          </button>
          {/* keyboard */}
          <button style={orbitBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2.5" y="6" width="19" height="13" rx="2.5" stroke={C.ink} strokeWidth="1.7"/>
              <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h.01M9 13h.01M12 13h.01M15 13h.01M18 13h.01M8 16h8" stroke={C.ink} strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const orbitBtn = {
  width: 52, height: 52, borderRadius: 999, border: `0.5px solid ${C.border}`,
  background: C.surface, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

// ═══════════════════════════════════════════════════════════
// E — Two-row composer: text + circular action rail (live recording state)
// ═══════════════════════════════════════════════════════════
function TemplateE() {
  return (
    <div style={screenBase}>
      <ChatHeader right="edit"/>
      <div style={scrollArea}>
        <SampleConvo/>
      </div>
      <div style={{ padding: '8px 12px 14px', background: C.cream }}>
        <div style={{
          background: C.surface, border: `0.5px solid ${C.border}`,
          borderRadius: 24, padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* recording state — mic is active */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '4px 2px',
          }}>
            {Icon.waveform()}
            <span style={{
              flex: 1, fontFamily: UI_FONT, fontSize: 14.5, color: C.ink,
            }}>"Make it a bit warmer and ask…"</span>
            <span style={{
              fontFamily: UI_FONT, fontSize: 12.5, color: C.muted,
              fontVariantNumeric: 'tabular-nums',
            }}>0:08</span>
          </div>
          {/* action rail */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            borderTop: `0.5px solid ${C.borderSoft}`, paddingTop: 10,
          }}>
            <CircleBtn>{Icon.plus(18, C.muted)}</CircleBtn>
            <CircleBtn>{Icon.camera(18, C.muted)}</CircleBtn>
            <CircleBtn>{Icon.envelope(17, C.muted)}</CircleBtn>
            <div style={{ flex: 1 }}/>
            <CircleBtn active>
              <span style={{
                width: 12, height: 12, borderRadius: 3, background: '#fff',
              }}/>
            </CircleBtn>
            <button style={{
              width: 36, height: 36, borderRadius: 999, border: 'none',
              background: C.ink, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Icon.arrowUp(16)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CircleBtn({ children, active }) {
  return (
    <button style={{
      width: 36, height: 36, borderRadius: 999, border: 'none',
      background: active ? C.coral : 'transparent',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}

// shared layout pieces
const screenBase = {
  height: '100%', display: 'flex', flexDirection: 'column',
  background: C.cream,
};
const scrollArea = {
  flex: 1, overflow: 'hidden', paddingBottom: 6,
};

Object.assign(window, { TemplateA, TemplateB, TemplateC, TemplateD, TemplateE });
