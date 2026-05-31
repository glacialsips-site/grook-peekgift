// LivePreview — the screen Claude is "building" behind the chat.
// This is the thing the user is conversing TO existence. The chat
// (glass) sits on top of this; minimize the keyboard to see it whole.
// Designed to be visually legible even when 60% obscured.

function LivePreview() {
  const sage = '#7A8B6F';
  const sageWash = '#E7ECDF';
  const ink = '#1F1E1D';
  const muted = '#6B6862';
  const bg = '#F5EFE4';
  const card = '#FFFFFF';

  // Last card is "just placed" — subtle highlight, as if Claude
  // dropped it in seconds ago. Sells the "being built" feeling.
  const rituals = [
    { name: 'Meditate', sub: '10 min · done',     state: 'done',     icon: 'lotus' },
    { name: 'Hydrate',  sub: '3 of 4 glasses',    state: 'progress', icon: 'drop'  },
    { name: 'Stretch',  sub: 'In progress · 4 min', state: 'active', icon: 'arc'   },
    { name: 'Journal',  sub: 'Up next',           state: 'upcoming', icon: 'book', justPlaced: true },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(120% 80% at 80% 0%, #F0E3D0 0%, ${bg} 50%, #E8E0D0 100%)`,
      overflow: 'hidden',
      fontFamily: UI_FONT, color: ink,
    }}>
      {/* gentle warm sun glow upper-right */}
      <div style={{
        position: 'absolute', top: -120, right: -80,
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,200,140,0.55) 0%, transparent 70%)',
        filter: 'blur(20px)',
      }}/>

      {/* sage frame across top, as if Claude is iterating chrome */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 200,
        background: `linear-gradient(180deg, ${sageWash}cc 0%, transparent 100%)`,
      }}/>

      <div style={{ position: 'relative', padding: '78px 22px 0' }}>
        {/* status row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12.5, fontWeight: 600, color: muted, letterSpacing: 0.4,
        }}>
          <span>FRI · MAR 7</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 9px', borderRadius: 999,
            background: '#fff', border: `0.5px solid #E5DFD2`,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999, background: sage,
            }}/>
            <span style={{ color: ink, fontSize: 11.5 }}>7-day streak</span>
          </div>
        </div>

        {/* hero title */}
        <div style={{
          marginTop: 18,
          fontFamily: SERIF, fontSize: 36, fontWeight: 500,
          lineHeight: 1.05, color: ink, letterSpacing: -0.6,
        }}>
          Morning<br/>rituals.
        </div>

        {/* progress hero card */}
        <div style={{
          marginTop: 22, background: card, borderRadius: 22,
          padding: 18,
          boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(80,60,30,0.06)',
          border: '0.5px solid #EEE6D6',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: muted, letterSpacing: 0.4 }}>
              TODAY · 2 OF 4
            </span>
            <span style={{ fontFamily: SERIF, fontSize: 22, color: ink }}>50%</span>
          </div>
          {/* 4 segment progress */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,1,0.6,0].map((v,i)=>(
              <div key={i} style={{
                flex: 1, height: 10, borderRadius: 999,
                background: '#EFE7D7', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${v*100}%`,
                  background: v === 1 ? sage : v > 0 ? `linear-gradient(90deg, ${sage}, ${sage}aa)` : 'transparent',
                  borderRadius: 999,
                }}/>
              </div>
            ))}
          </div>
        </div>

        {/* section heading */}
        <div style={{
          marginTop: 22, marginBottom: 10,
          fontSize: 11.5, fontWeight: 700, color: muted, letterSpacing: 0.8,
        }}>TODAY'S RITUALS</div>

        {/* habit cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rituals.map((r, i) => (
            <RitualCard key={r.name} {...r} sage={sage} sageWash={sageWash} ink={ink} muted={muted} card={card}/>
          ))}
        </div>
      </div>

      {/* tab bar at bottom of preview */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '14px 40px 36px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(180deg, transparent 0%, #F5EFE4 60%)',
      }}>
        {['Today','Habits','Stats','You'].map((t,i)=>(
          <div key={t} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            fontSize: 10.5, fontWeight: 600,
            color: i === 0 ? ink : muted,
            opacity: i === 0 ? 1 : 0.6,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: i === 0 ? sage : 'transparent',
              border: i === 0 ? 'none' : `1.5px solid ${muted}`,
              opacity: i === 0 ? 1 : 0.4,
            }}/>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function RitualCard({ name, sub, state, icon, justPlaced, sage, sageWash, ink, muted, card }) {
  const isDone = state === 'done';
  const isActive = state === 'active';
  return (
    <div style={{
      position: 'relative',
      background: card, borderRadius: 18, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      border: `0.5px solid ${justPlaced ? sage : '#EEE6D6'}`,
      boxShadow: justPlaced
        ? `0 0 0 3px ${sageWash}, 0 6px 18px rgba(122,139,111,0.18)`
        : '0 1px 0 rgba(0,0,0,0.02)',
      animation: justPlaced ? 'rcardIn 1.6s ease-out infinite alternate' : undefined,
    }}>
      <RitualIcon kind={icon} done={isDone} active={isActive} sage={sage} sageWash={sageWash} muted={muted}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: ink, textDecoration: isDone ? 'line-through' : 'none', textDecorationColor: muted }}>
          {name}
        </div>
        <div style={{ fontSize: 12.5, color: muted, marginTop: 1 }}>{sub}</div>
      </div>
      {isDone ? (
        <div style={{
          width: 26, height: 26, borderRadius: 999, background: sage,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      ) : (
        <div style={{
          width: 26, height: 26, borderRadius: 999,
          border: `1.5px solid ${isActive ? sage : '#D8D0BF'}`,
          background: isActive ? sageWash : 'transparent',
        }}/>
      )}
      {justPlaced && (
        <div style={{
          position: 'absolute', top: -8, right: 10,
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          padding: '2px 7px', borderRadius: 999,
          background: sage, color: '#fff',
        }}>NEW</div>
      )}
    </div>
  );
}

function RitualIcon({ kind, done, active, sage, sageWash, muted }) {
  const color = done ? sage : active ? sage : muted;
  const bg = done ? sageWash : active ? sageWash : '#F2ECDE';
  const glyphs = {
    lotus: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 17C6 17 4 13 4 11c2 0 4 1 5 3M12 17c6 0 8-4 8-6-2 0-4 1-5 3M12 17c-3 0-4-4-4-7 2 0 3 2 4 4M12 17c3 0 4-4 4-7-2 0-3 2-4 4M12 17v-7" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    drop:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3c-4 5-7 9-7 12a7 7 0 0 0 14 0c0-3-3-7-7-12z" stroke={color} strokeWidth="1.7" fill={done ? color : 'none'}/></svg>,
    arc:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 18c2-8 14-8 16 0" stroke={color} strokeWidth="1.7" strokeLinecap="round"/><circle cx="4" cy="18" r="2" fill={color}/><circle cx="20" cy="18" r="2" fill={color}/></svg>,
    book:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H5V5zM19 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7V5z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  };
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{glyphs[kind]}</div>
  );
}

Object.assign(window, { LivePreview });
