'use client';

// ============================================================================
// app/studio/ios-frame.tsx — the iOS 26 (liquid-glass) device frame.
// Ported from reference/chat-ui/ios-frame.jsx (device shell only — status bar,
// dynamic island, home indicator). A `backdrop` slot sits at z-0 (the live PeekRenderer
// preview); `children` float on top at z-1 (the docked chat). SHELL_SPEC §0: the
// renderer is the device backdrop; the chat is glass over it.
// ============================================================================

import React from 'react';

function IOSStatusBar({ dark = true, time = '9:41' }: { dark?: boolean; time?: string }) {
  const c = dark ? '#fff' : '#000';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '21px 30px 19px',
        boxSizing: 'border-box',
        position: 'relative',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: '-apple-system, "SF Pro", system-ui',
            fontWeight: 590,
            fontSize: 17,
            lineHeight: '22px',
            color: c,
            textShadow: dark ? '0 1px 2px rgba(0,0,0,0.25)' : 'none',
          }}
        >
          {time}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingRight: 1 }}>
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c} />
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c} />
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c} />
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c} />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={c} />
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill={c} />
          <circle cx="8.5" cy="10.5" r="1.5" fill={c} />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none" />
          <rect x="2" y="2" width="20" height="9" rx="2" fill={c} />
          <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill={c} fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

export interface IOSDeviceProps {
  children: React.ReactNode;
  backdrop?: React.ReactNode;
  /** dark status-bar/home-indicator tint (live preview backdrops are usually dark) */
  dark?: boolean;
  width?: number;
  height?: number;
}

/**
 * The bezel. Fixed logical dimensions (default 402×874, the reference size); the
 * caller scales it to fit the viewport via CSS transform. backdrop at z-0, chat at z-1.
 */
export function IOSDevice({ children, backdrop, dark = true, width = 402, height = 874 }: IOSDeviceProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 56,
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
        boxShadow: '0 40px 90px rgba(0,0,0,0.45), 0 0 0 11px #0b0b0d, 0 0 0 12px rgba(255,255,255,0.08)',
        fontFamily: '-apple-system, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        flexShrink: 0,
      }}
    >
      {/* backdrop layer — the live preview; sits below all chat UI */}
      {backdrop && <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>{backdrop}</div>}

      {/* dynamic island */}
      <div
        style={{
          position: 'absolute',
          top: 11,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 126,
          height: 37,
          borderRadius: 24,
          background: '#000',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      />

      {/* status bar (absolute, above chat so the time stays visible) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 }}>
        <IOSStatusBar dark={dark} />
      </div>

      {/* chat / foreground content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>{children}</div>

      {/* home indicator — always on top */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          height: 34,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingBottom: 9,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 139,
            height: 5,
            borderRadius: 100,
            background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
          }}
        />
      </div>
    </div>
  );
}
