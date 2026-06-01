// The live chat: glass header, fading message stream, thin input pill,
// custom keyboard with embedded tools.

// ─── Convo: user art-directing a product landing in real time ──
function LiveConvo() {
  return (
    <>
      <LClaudeMsg>What're we shipping?</LClaudeMsg>
      <LUserMsg>HEMLOCK spring landing. Moody hero, then horizontal sets — drop, kit, lookbook, restocks.</LUserMsg>
      <LClaudeMsg>
        Building. Drop is up with four SKUs, Field Kit is a numbered
        bundle, Lookbook scrolls big editorial cards. Pinged the
        sections I just touched so you can spot the changes.
      </LClaudeMsg>
      <LUserMsg>Add the wool throw to The Drop. NEW badge.</LUserMsg>
      <LClaudeMsg>
        Slotted in third — JUST PLACED chip on it. Want the kit
        cards to circle-link with a dashed thread, or stay separate?
      </LClaudeMsg>
    </>
  );
}

// ─── Message variants tuned for legibility over a busy backdrop ──
// Each message gets a feathered "ink wash" — a soft glass region behind
// it that dims the backdrop only where text lands. The wash bleeds
// outward and fades to transparent so there's no hard rectangle.
// Net effect: every word is legible without ever drawing a bubble.
// One continuous smoke film behind the scroll region: fades in from
// the top (matching the mask) and grounds messages near the bottom
// where they meet bright product cards. No per-message rectangles.
function SmokeFilm() {
  const grad = 'linear-gradient(180deg, transparent 0%, transparent 18%, rgba(14,8,5,0.30) 38%, rgba(14,8,5,0.55) 70%, rgba(14,8,5,0.62) 100%)';
  return (
    <>
      {/* solid tonal floor */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: grad,
      }}/>
      {/* blur layer (where supported) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        maskImage: 'linear-gradient(180deg, transparent 0%, transparent 12%, #000 38%, #000 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, transparent 12%, #000 38%, #000 100%)',
      }}/>
    </>
  );
}

function LClaudeMsg({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'flex-start' }}>
      <div style={{ paddingTop: 4 }}><ClaudeMark size={15} color="#fff"/></div>
      <div style={{
        flex: 1, color: '#fff',
        fontFamily: SERIF, fontSize: 16.5, lineHeight: 1.45, letterSpacing: -0.1,
        textShadow: '0 1px 1px rgba(0,0,0,0.55), 0 0 14px rgba(0,0,0,0.35)',
      }}>{children}</div>
    </div>
  );
}

function LUserMsg({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 16px' }}>
      <div style={{
        maxWidth: '78%',
        padding: '8px 13px', borderRadius: 18, borderBottomRightRadius: 6,
        background: 'rgba(217,119,87,0.78)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        border: '0.5px solid rgba(255,210,180,0.55)',
        boxShadow: 'inset 0 1px 0 rgba(255,235,220,0.4), 0 1px 4px rgba(120,40,20,0.18)',
        color: '#fff',
        fontFamily: UI_FONT, fontSize: 15, lineHeight: 1.4,
        textShadow: '0 1px 1px rgba(80,20,5,0.45)',
      }}>{children}</div>
    </div>
  );
}

// ─── Glass header (compact) ───────────────────────────────
function LiveHeader() {
  return (
    <div style={{
      paddingTop: 56, padding: '56px 14px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', zIndex: 5,
      // very subtle so it doesn't claim space
      background: 'linear-gradient(180deg, rgba(255,250,245,0.28) 0%, rgba(255,250,245,0.0) 100%)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }}>
      <button style={liveHdrBtn}>{Icon.sidebar(20, '#fff')}</button>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 11px', borderRadius: 999,
        background: 'rgba(30,20,15,0.42)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.25)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        fontFamily: UI_FONT, fontSize: 12.5, fontWeight: 600, color: '#fff',
        textShadow: '0 1px 1px rgba(0,0,0,0.4)',
      }}>
        <ClaudeMark size={12} color="#fff"/>
        Sonnet 4.5
        {Icon.chevDown(10, 'rgba(255,255,255,0.9)')}
      </div>
      <button style={liveHdrBtn}>{Icon.more(20, '#fff')}</button>
    </div>
  );
}
const liveHdrBtn = {
  width: 34, height: 34, borderRadius: 999, padding: 0, border: 'none', cursor: 'pointer',
  background: 'rgba(30,20,15,0.38)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '0.5px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ─── Thin input pill above the keyboard ───────────────────
function LiveInput({ value = '' }) {
  return (
    <div style={{ padding: '6px 12px 8px', position: 'relative', zIndex: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 8px 8px 14px', borderRadius: 999,
        background: 'rgba(255,250,245,0.28)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.5)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 14px rgba(40,20,10,0.1)',
      }}>
        <div style={{
          flex: 1, fontFamily: UI_FONT, fontSize: 15.5,
          color: value ? '#fff' : 'rgba(255,255,255,0.7)',
          textShadow: '0 1px 1px rgba(0,0,0,0.18)',
          padding: '2px 0',
        }}>{value || 'Tell Claude what to change…'}</div>
        <button style={{
          width: 34, height: 34, borderRadius: 999, padding: 0, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.92)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.arrowUp(14, C.coralDeep)}</button>
      </div>
    </div>
  );
}

// ─── The whole layout ─────────────────────────────────────
function LiveChat() {
  // scroll to bottom on mount so newest msgs are visible
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, []);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      <LiveHeader/>
      {/* scroll region wrapped so the smoke film stays fixed while messages scroll */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <SmokeFilm/>
        <div
          ref={ref}
          style={{
            position: 'absolute', inset: 0,
            overflowY: 'auto', overflowX: 'hidden',
            paddingTop: 60, paddingBottom: 8,
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.15) 30px, rgba(0,0,0,0.55) 90px, #000 150px)',
            maskImage: 'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.15) 30px, rgba(0,0,0,0.55) 90px, #000 150px)',
          }}
        >
          <LiveConvo/>
        </div>
      </div>
      <LiveInput/>
      <ChatKeyboard/>
    </div>
  );
}

Object.assign(window, { LiveChat, LiveHeader, LiveInput, LClaudeMsg, LUserMsg });
