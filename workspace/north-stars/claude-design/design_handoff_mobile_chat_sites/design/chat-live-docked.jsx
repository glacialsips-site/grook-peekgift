// Variant: keyboard dismissed. Chat collapses to a single dock pill at
// the bottom so the preview can be seen whole. Tap the pill to bring
// the chat back up.

function LiveChatDocked() {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      <LiveHeader/>
      <div style={{ flex: 1 }}/>
      {/* dock pill */}
      <div style={{ padding: '8px 14px 22px', position: 'relative', zIndex: 4 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 8px 10px 16px', borderRadius: 999,
          background: 'rgba(255,250,245,0.28)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.5)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px rgba(40,20,10,0.18)',
        }}>
          <ClaudeMark size={16} color="#fff"/>
          <div style={{
            flex: 1, fontFamily: UI_FONT, fontSize: 15, color: 'rgba(255,255,255,0.85)',
            textShadow: '0 1px 1px rgba(0,0,0,0.18)',
          }}>Ask Claude to refine…</div>
          <DockBtn>{Icon.envelope(17, '#fff')}</DockBtn>
          <DockBtn>{Icon.mic(18, '#fff')}</DockBtn>
        </div>
      </div>
    </div>
  );
}

function DockBtn({ children }) {
  return (
    <button style={{
      width: 36, height: 36, borderRadius: 999, padding: 0, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.22)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '0.5px solid rgba(255,255,255,0.4)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
    }}>{children}</button>
  );
}

Object.assign(window, { LiveChatDocked });
