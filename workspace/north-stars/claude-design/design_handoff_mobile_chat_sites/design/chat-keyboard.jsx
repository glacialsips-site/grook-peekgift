// Custom keyboard with chat tools baked into the accessory bar.
// Tools (+, camera, email, mic) live where iOS predictive text usually sits.
// Saves an entire composer row of vertical space.

function ChatKeyboard() {
  const glyph = 'rgba(255,255,255,0.95)';
  const glyphMute = 'rgba(255,255,255,0.75)';
  const keyBg = 'rgba(255,255,255,0.32)';
  const keyShine = 'inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 0 rgba(0,0,0,0.04)';

  const key = (content, opts = {}) => {
    const { w, flex, accent, fs = 22, k } = opts;
    return (
      <div key={k} style={{
        height: 42, borderRadius: 8.5,
        flex: flex ? 1 : undefined, width: w, minWidth: 0,
        background: accent ? C.coral : keyBg,
        boxShadow: keyShine,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, "SF Compact", system-ui',
        fontSize: fs, fontWeight: 460, color: accent ? '#fff' : glyph,
        textShadow: accent ? 'none' : '0 1px 1px rgba(0,0,0,0.18)',
      }}>{content}</div>
    );
  };

  const row = (keys, pad = 0) => (
    <div style={{ display: 'flex', gap: 6.5, justifyContent: 'center', padding: `0 ${pad}px` }}>
      {keys.map(l => key(l, { flex: true, k: l }))}
    </div>
  );

  const shiftIcon = <svg width="19" height="17" viewBox="0 0 19 17"><path d="M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z" fill={glyph}/></svg>;
  const delIcon = <svg width="23" height="17" viewBox="0 0 23 17"><path d="M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z" fill="none" stroke={glyph} strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 5l7 7M17 5l-7 7" stroke={glyph} strokeWidth="1.6" strokeLinecap="round"/></svg>;
  const retIcon = <svg width="20" height="14" viewBox="0 0 20 14"><path d="M18 1v6H4m0 0l4-4M4 7l4 4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const globeIcon = <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke={glyph} strokeWidth="1.6"/><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" stroke={glyph} strokeWidth="1.6"/></svg>;

  return (
    <div style={{
      position: 'relative', zIndex: 15, borderRadius: 27,
      padding: '10px 0 8px',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      // Same warm glass recipe as the chat surface — feels like one slab
      background: 'rgba(255,250,245,0.20)',
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      borderTop: '0.5px solid rgba(255,255,255,0.5)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
    }}>
      {/* ─── Tools accessory bar (replaces autocorrect) ─── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 4, padding: '4px 10px 10px',
      }}>
        <KbdTool>{Icon.plus(21, '#fff')}</KbdTool>
        <KbdTool>{Icon.paperclip(19, '#fff')}</KbdTool>
        <KbdTool>{Icon.camera(20, '#fff')}</KbdTool>
        <KbdTool>{Icon.envelope(19, '#fff')}</KbdTool>
        <div style={{ flex: 1 }}/>
        <KbdTool>{Icon.mic(20, '#fff')}</KbdTool>
      </div>

      {/* ─── QWERTY ─── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 11,
        padding: '0 6.5px',
      }}>
        {row(['q','w','e','r','t','y','u','i','o','p'])}
        {row(['a','s','d','f','g','h','j','k','l'], 20)}
        <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
          {key(shiftIcon, { w: 42, k: 'shift' })}
          <div style={{ display: 'flex', gap: 6.5, flex: 1 }}>
            {['z','x','c','v','b','n','m'].map(l => key(l, { flex: true, k: l }))}
          </div>
          {key(delIcon, { w: 42, k: 'del' })}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {key('123', { w: 56, fs: 17, k: '123' })}
          {key(globeIcon, { w: 42, k: 'globe' })}
          {key('space', { flex: true, fs: 14, k: 'space' })}
          {key(retIcon, { w: 86, accent: true, k: 'ret' })}
        </div>
      </div>
    </div>
  );
}

function KbdTool({ children }) {
  return (
    <button style={{
      width: 38, height: 38, borderRadius: 999, padding: 0, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.22)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '0.5px solid rgba(255,255,255,0.35)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
    }}>{children}</button>
  );
}

Object.assign(window, { ChatKeyboard, KbdTool });
