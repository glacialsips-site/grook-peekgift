// HEMLOCK product page — restructured around horizontal sets that
// stack vertically. Each section uses a different card style so the
// page reads varied (product / bundle / editorial / restock).
// Also adds "live change ping" indicators that Claude lights up to
// show the user what just got placed or edited.

function ProductPreview() {
  const ink = '#181412';
  const cream = '#F2EBDD';
  const muted = '#6B5E50';
  const accent = '#A86B3E';
  const sage = '#5A6B4F';

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: cream, fontFamily: UI_FONT, color: ink,
    }}>
      {/* ── top nav ───────────────────────────────────────── */}
      <TopNav cream={cream} accent={accent}/>

      {/* ── HERO ─────────────────────────────────────────── */}
      <Hero/>

      {/* ── bordered drop sections stack vertically below hero ── */}
      <div style={{
        position: 'absolute', top: 540, left: 0, right: 0, bottom: 0,
        overflow: 'hidden',
      }}>
        <SectionFrame eyebrow="NEW" title="The Drop" meta="03 pieces" pinged>
          <ProductCard name="Trail Pack 28" price="$245" colors={['#2A3528','#1A1612']} sub="Cordura · slate"/>
          <ProductCard name="Vacuum Bottle" price="$48"  colors={['#A8957D','#6B5E50']} sub="24oz · brushed"/>
          <ProductCard name="Wool Throw"   price="$185" colors={['#B5704A','#7A3F1F']} sub="merino · rust"  badge="NEW" pinged/>
          <ProductCard name="Linen Tee"    price="$68"  colors={['#D4C8B3','#A89878']} sub="washed · stone"/>
        </SectionFrame>

        <SectionFrame eyebrow="BAGS" title="The Carry" meta="04 pieces">
          <ProductCard name="Field Tote"   price="$128" colors={['#7A4A2C','#3F2515']} sub="waxed · tobacco"/>
          <ProductCard name="Daypack 18"   price="$165" colors={['#3A4B5A','#1A2230']} sub="ripstop · slate"/>
          <ProductCard name="Sling"        price="$88"  colors={['#1F1A14','#0F0C08']} sub="500D · black"/>
          <ProductCard name="Cardholder"   price="$42"  colors={['#5C3A1F','#2E1A0E']} sub="oiled · espresso"/>
        </SectionFrame>

        <SectionFrame eyebrow="LAYERS" title="The Field" meta="04 pieces">
          <ProductCard name="Field Sweater"  price="$245" colors={['#5C5040','#2E2618']} sub="merino · briar"/>
          <ProductCard name="Camp Vest"      price="$185" colors={['#5A6B4F','#2E3825']} sub="down · olive"/>
          <ProductCard name="Linen Overshirt" price="$158" colors={['#D4C8B3','#8A7E68']} sub="washed · bone"/>
          <ProductCard name="Wool Trouser"   price="$215" colors={['#3A3530','#1E1A15']} sub="flannel · ink"/>
        </SectionFrame>

        <SectionFrame eyebrow="KITCHEN · TOOLS" title="The Camp" meta="04 pieces">
          <ProductCard name="Enamel Mug"     price="$24"  colors={['#9A8B72','#5E5040']} sub="speckled · sand"/>
          <ProductCard name="Pour-over Kettle" price="$98" colors={['#8A8480','#3F3A36']} sub="steel · brushed"/>
          <ProductCard name="Pocket Knife"   price="$76"  colors={['#7A5638','#3A2615']} sub="walnut · brass"/>
          <ProductCard name="Trail Axe"      price="$145" colors={['#5C3A1F','#1E120A']} sub="hickory · forged"/>
        </SectionFrame>

        <SectionFrame eyebrow="BACK IN STOCK" title="The Restocks" meta="this week">
          <ProductCard name="Heavyweight Hoodie" price="$148" colors={['#3A3530','#1E1A15']} sub="loopback · pine"/>
          <ProductCard name="Camp Mug"           price="$24"  colors={['#9A8B72','#5E5040']} sub="enamel · sand"/>
          <ProductCard name="Wool Beanie"        price="$42"  colors={['#7A3F1F','#3A1F0E']} sub="ribbed · rust"/>
          <ProductCard name="Quilted Liner"      price="$185" colors={['#5A6B4F','#3A4533']} sub="recycled · sage"/>
        </SectionFrame>

        <div style={{ height: 80 }}/>
      </div>
    </div>
  );
}

// ─── HERO ────────────────────────────────────────────────
function Hero() {
  const ink = '#181412';
  const cream = '#F2EBDD';
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 540 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: [
          'radial-gradient(ellipse 80% 60% at 80% 30%, #C97A3E 0%, transparent 55%)',
          'radial-gradient(ellipse 100% 70% at 20% 70%, #1E2620 0%, transparent 60%)',
          'linear-gradient(180deg, #2A2018 0%, #1A1612 35%, #0F1110 70%, #0A0B0A 100%)',
        ].join(', '),
      }}/>
      <img
        src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80&auto=format&fit=crop"
        alt=""
        loading="eager"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.85,
        }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: [
          'linear-gradient(180deg, rgba(30,20,15,0.45) 0%, transparent 35%, rgba(10,8,5,0.65) 75%, rgba(10,8,5,0.92) 100%)',
          'linear-gradient(90deg, rgba(20,10,5,0.55) 0%, transparent 45%)',
        ].join(', '),
      }}/>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='8'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      }}/>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 78, color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, opacity: 0.85, marginBottom: 14 }}>
          THE FIELD COLLECTION · MMXXVI
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 46, fontWeight: 400,
          lineHeight: 0.95, letterSpacing: -1.2,
        }}>
          Built for<br/>
          <span style={{ fontStyle: 'italic', fontWeight: 500 }}>early miles.</span>
        </div>
        <div style={{ marginTop: 14, fontSize: 13.5, lineHeight: 1.5, opacity: 0.82, maxWidth: 280 }}>
          Quietly engineered gear for the long way home —
          tested in the Cascades, finished by hand in Oregon.
        </div>
        <button style={{
          marginTop: 18, padding: '11px 18px', borderRadius: 0,
          background: cream, color: ink, border: 'none', cursor: 'pointer',
          fontFamily: UI_FONT, fontSize: 12.5, fontWeight: 700,
          letterSpacing: 1.6, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          Shop the collection
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5h12m0 0l-4-4m4 4l-4 4" stroke={ink} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Top nav ─────────────────────────────────────────────
function TopNav() {
  return (
    <div style={{
      position: 'absolute', top: 60, left: 0, right: 0,
      padding: '0 18px', height: 38,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      zIndex: 4, color: '#fff',
    }}>
      <NavIcon><path d="M14 4l-6 6 6 6" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/></NavIcon>
      <div style={{
        fontFamily: SERIF, fontSize: 15, fontWeight: 600,
        letterSpacing: 3, textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}>HEMLOCK</div>
      <NavIcon>
        <path d="M5 7h14l-1.5 10a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7L5 7zM8 7V5a4 4 0 0 1 8 0v2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="17" cy="6" r="3.2" fill="#A86B3E" stroke="#F2EBDD" strokeWidth="1"/>
      </NavIcon>
    </div>
  );
}

function NavIcon({ children }) {
  return (
    <button style={{
      width: 36, height: 36, borderRadius: 999, padding: 0, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(20,15,10,0.32)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      border: '0.5px solid rgba(255,255,255,0.18)',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{children}</svg>
    </button>
  );
}

// ─── Bordered section frame (eyebrow / title / meta + horizontal scroller) ──
// Each product group lives in its own thin-bordered catalog card.
function SectionFrame({ eyebrow, title, meta, pinged, children }) {
  return (
    <div style={{
      margin: '14px 14px 0',
      borderRadius: 8,
      border: '0.5px solid rgba(24,20,18,0.18)',
      background: 'rgba(255,253,247,0.5)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.5)',
      overflow: 'hidden',
    }}>
      {/* header — eyebrow + title + meta */}
      <div style={{ padding: '11px 14px 9px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2,
          fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: '#A86B3E',
        }}>
          <span>{eyebrow}</span>
          {pinged && <Ping label="updated by claude"/>}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, letterSpacing: -0.3 }}>
            {title}
          </div>
          <div style={{ fontSize: 10.5, color: '#6B5E50', letterSpacing: 0.4, fontWeight: 600 }}>
            {meta}
          </div>
        </div>
      </div>
      {/* hairline divider between header and carousel */}
      <div style={{ height: 0.5, background: 'rgba(24,20,18,0.12)', margin: '0 14px' }}/>
      {/* horizontal carousel inside the frame */}
      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden',
        padding: '12px 14px',
        scrollbarWidth: 'none',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Original Section wrapper (kept for compatibility) ──
function Section({ eyebrow, title, meta, pinged, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ padding: '0 22px 12px', position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4,
          fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5, color: '#A86B3E',
        }}>
          <span>{eyebrow}</span>
          {pinged && <Ping label="updated by claude"/>}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, letterSpacing: -0.3 }}>
            {title}
          </div>
          <div style={{ fontSize: 11.5, color: '#6B5E50', letterSpacing: 0.4, fontWeight: 600 }}>
            {meta}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Live-change "ping" — Claude lights this up when it touches a section ──
function Ping({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 7px 3px 6px', borderRadius: 999,
      background: 'rgba(168,107,62,0.12)',
      border: '0.5px solid rgba(168,107,62,0.35)',
      fontSize: 9.5, letterSpacing: 1.6, color: '#A86B3E',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: 999, background: '#A86B3E',
        boxShadow: '0 0 0 3px rgba(168,107,62,0.18)',
      }}/>
      {label}
    </span>
  );
}

// ─── Horizontal carousel ─────────────────────────────────
function Carousel({ children, linked, gap = 12 }) {
  return (
    <div style={{
      display: 'flex', gap, overflowX: 'auto', overflowY: 'hidden',
      padding: '0 22px 12px',
      scrollbarWidth: 'none',
      position: 'relative',
    }}>
      {linked && (
        <div style={{
          position: 'absolute', top: 38, left: 50, right: 50,
          height: 1, borderTop: '1px dashed rgba(168,107,62,0.45)',
        }}/>
      )}
      {children}
    </div>
  );
}

// ─── Product card (standard) ─────────────────────────────
function ProductCard({ name, price, sub, badge, colors = ['#888','#444'], pinged }) {
  return (
    <div style={{
      width: 152, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 8,
      position: 'relative',
    }}>
      <div style={{
        position: 'relative', aspectRatio: '4/5',
        background: `linear-gradient(160deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        borderRadius: 6, overflow: 'hidden',
        outline: pinged ? '1.5px solid #A86B3E' : 'none',
        boxShadow: pinged ? '0 0 0 4px rgba(168,107,62,0.18)' : 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.15) 0%, transparent 40%)',
        }}/>
        {badge && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: '#fff', color: '#181412',
            fontSize: 9.5, fontWeight: 700, letterSpacing: 1,
            padding: '3px 7px', borderRadius: 0,
          }}>{badge}</div>
        )}
        {pinged && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: '#A86B3E', color: '#fff',
            fontSize: 8.5, fontWeight: 700, letterSpacing: 1.2,
            padding: '3px 6px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: '#fff' }}/>
            JUST PLACED
          </div>
        )}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontSize: 13, fontWeight: 600,
      }}>
        <span style={{ letterSpacing: -0.1 }}>{name}</span>
        <span>{price}</span>
      </div>
      {sub && <div style={{ fontSize: 11.5, color: '#6B5E50', marginTop: -4 }}>{sub}</div>}
    </div>
  );
}

// ─── Bundle card (numbered, smaller, linked) ─────────────
function BundleCard({ n, name, colors }) {
  return (
    <div style={{
      width: 96, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 6,
      alignItems: 'center', position: 'relative', zIndex: 1,
    }}>
      <div style={{
        position: 'relative', width: 76, height: 76, borderRadius: '50%',
        background: `linear-gradient(160deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 22, height: 22, borderRadius: 999, background: '#F2EBDD',
          fontFamily: 'Source Serif 4, serif', fontSize: 12, fontWeight: 700,
          color: '#A86B3E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '0.5px solid rgba(168,107,62,0.3)',
        }}>{n}</div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{name}</div>
    </div>
  );
}

// ─── Editorial card (tall, image-first) ──────────────────
function EditorialCard({ title, colors, chip }) {
  return (
    <div style={{
      width: 220, flexShrink: 0,
      position: 'relative', aspectRatio: '3/4',
      background: `linear-gradient(170deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)',
      }}/>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.18, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      }}/>
      {chip && (
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(255,255,255,0.92)', color: '#181412',
          fontSize: 9.5, fontWeight: 700, letterSpacing: 1.5,
          padding: '3px 7px', borderRadius: 999,
        }}>{chip}</div>
      )}
      <div style={{
        position: 'absolute', bottom: 14, left: 14, right: 14, color: '#fff',
      }}>
        <div style={{
          fontFamily: SERIF, fontSize: 17, fontWeight: 500, lineHeight: 1.15,
          letterSpacing: -0.2, textShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}>{title}</div>
        <div style={{
          marginTop: 6, fontSize: 10.5, fontWeight: 700,
          letterSpacing: 1.5, opacity: 0.85,
        }}>READ STORY →</div>
      </div>
    </div>
  );
}

Object.assign(window, { ProductPreview });
