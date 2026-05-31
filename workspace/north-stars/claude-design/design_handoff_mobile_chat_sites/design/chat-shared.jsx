// Shared bits used by every chat template: tokens, icons, header, messages.

const C = {
  cream: '#FAF7F2',
  surface: '#FFFFFF',
  ink: '#1F1E1D',
  muted: '#6B6862',
  faint: '#9C988F',
  border: '#E8E1D5',
  borderSoft: '#EFEAE0',
  coral: '#D97757',
  coralDeep: '#BF5A3D',
  coralWash: '#F4E4D8',
  coralTint: '#FBEFE6',
};

const UI_FONT = '-apple-system, "SF Pro Text", system-ui, sans-serif';
const SERIF = '"Source Serif 4", "Tiempos Text", "Iowan Old Style", Georgia, serif';

// ─── Icons ────────────────────────────────────────────────────
const Icon = {
  mic: (size = 18, color = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="12" rx="3" fill={color}/>
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  envelope: (size = 18, color = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5.5" width="18" height="13" rx="2.4" stroke={color} strokeWidth="1.7"/>
      <path d="M4 7.5l8 5.5 8-5.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  envelopeSolid: (size = 18, color = '#fff') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5.5" width="18" height="13" rx="2.4" fill={color}/>
      <path d="M4 7.5l8 5.5 8-5.5" stroke={C.coral} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  plus: (size = 20, color = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  send: (size = 18, color = '#fff') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12l14-7-5 16-3.5-6L5 12z" fill={color}/>
    </svg>
  ),
  arrowUp: (size = 18, color = '#fff') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  chevDown: (size = 12, color = C.muted) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 4l4 4 4-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  more: (size = 20, color = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.8" fill={color}/>
      <circle cx="12" cy="12" r="1.8" fill={color}/>
      <circle cx="19" cy="12" r="1.8" fill={color}/>
    </svg>
  ),
  sidebar: (size = 22, color = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4.5" width="18" height="15" rx="3" stroke={color} strokeWidth="1.7"/>
      <path d="M10 5v14" stroke={color} strokeWidth="1.7"/>
    </svg>
  ),
  edit: (size = 20, color = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 19l3-1 11-11-2-2L6 16l-1 3z" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  ),
  camera: (size = 20, color = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 8.5C3 7.4 3.9 6.5 5 6.5h2l1.5-2h7L17 6.5h2c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-9z" stroke={color} strokeWidth="1.7"/>
      <circle cx="12" cy="13" r="3.5" stroke={color} strokeWidth="1.7"/>
    </svg>
  ),
  paperclip: (size = 18, color = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  waveform: (color = C.coral) => (
    <svg width="68" height="22" viewBox="0 0 68 22" fill="none">
      {[3, 8, 14, 20, 18, 12, 7, 11, 16, 19, 14, 9, 5, 8, 13, 17, 11, 6, 4]
        .map((h, i) => (
          <rect key={i} x={i * 3.5 + 1} y={11 - h / 2} width="2" height={h} rx="1" fill={color}/>
        ))}
    </svg>
  ),
};

// ─── Claude star glyph ──────────────────────────────────────
function ClaudeMark({ size = 22, color = C.coral }) {
  // simplified asterisk/sunburst — Claude visual DNA without copying exact logo
  const r1 = size * 0.5, r2 = size * 0.16;
  return (
    <svg width={size} height={size} viewBox={`-${size/2} -${size/2} ${size} ${size}`}>
      {[0, 45, 90, 135].map(a => (
        <rect key={a} x={-r2/2} y={-r1} width={r2} height={r1*2} rx={r2/2}
              fill={color} transform={`rotate(${a})`} />
      ))}
    </svg>
  );
}

// ─── In-app header ──────────────────────────────────────────
function ChatHeader({ model = 'Sonnet 4.5', right = 'more' }) {
  return (
    <div style={{
      paddingTop: 56, paddingBottom: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '56px 14px 10px',
      borderBottom: `0.5px solid ${C.borderSoft}`,
      background: C.cream, position: 'relative', zIndex: 5,
    }}>
      <button style={iconBtn}>{Icon.sidebar(22, C.ink)}</button>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 999,
        background: C.surface, border: `0.5px solid ${C.border}`,
        fontFamily: UI_FONT, fontSize: 14, fontWeight: 500, color: C.ink,
      }}>
        <ClaudeMark size={14}/>
        <span>{model}</span>
        {Icon.chevDown(11)}
      </div>
      <button style={iconBtn}>
        {right === 'edit' ? Icon.edit(22) : Icon.more(22)}
      </button>
    </div>
  );
}

const iconBtn = {
  width: 36, height: 36, borderRadius: 999, border: 'none',
  background: 'transparent', display: 'flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
};

// ─── Messages ──────────────────────────────────────────────
function UserMsg({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 16px' }}>
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px', borderRadius: 20, borderBottomRightRadius: 6,
        background: C.coralWash, color: C.ink,
        fontFamily: UI_FONT, fontSize: 15.5, lineHeight: 1.4,
      }}>{children}</div>
    </div>
  );
}

function ClaudeMsg({ children, showMark = true }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'flex-start' }}>
      {showMark
        ? <div style={{ paddingTop: 4 }}><ClaudeMark size={16}/></div>
        : <div style={{ width: 16 }}/>}
      <div style={{
        flex: 1, color: C.ink,
        fontFamily: SERIF, fontSize: 16.5, lineHeight: 1.5,
        letterSpacing: -0.1,
      }}>{children}</div>
    </div>
  );
}

// shared draft snippet — feels like Claude wrote it
function DraftCard({ children }) {
  return (
    <div style={{
      marginTop: 8, padding: 12,
      background: C.surface, border: `0.5px solid ${C.border}`,
      borderRadius: 14, fontFamily: UI_FONT, fontSize: 14, lineHeight: 1.45,
      color: C.ink,
    }}>{children}</div>
  );
}

Object.assign(window, { C, UI_FONT, SERIF, Icon, ClaudeMark, ChatHeader, UserMsg, ClaudeMsg, DraftCard, iconBtn });
