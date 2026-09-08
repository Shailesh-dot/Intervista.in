import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ALERTS = 30;
const SESSION_KEY = 'screenProctorAlerts';
const BANNER_DURATION = 4000; // ms to show each alert banner

// ─── Cheat key definitions ─────────────────────────────────────────────────────
// Returns a human-readable violation label if this keyboard event is a cheat,
// or null if it should be allowed through.
function getCheatLabel(e) {
  const ctrl  = e.ctrlKey  || e.metaKey; // metaKey = Cmd on Mac
  const shift = e.shiftKey;
  const alt   = e.altKey;
  const key   = e.key?.toUpperCase();
  const code  = e.code;

  // ── DevTools & source view ─────────────────────────────────────────────────
  if (key === 'F12')                         return 'DevTools (F12)';
  if (ctrl && shift && key === 'I')          return 'DevTools (Ctrl+Shift+I)';
  if (ctrl && shift && key === 'J')          return 'DevTools Console (Ctrl+Shift+J)';
  if (ctrl && shift && key === 'C')          return 'DevTools Inspect (Ctrl+Shift+C)';
  if (ctrl && key === 'U')                   return 'View Source (Ctrl+U)';
  if (key === 'F11')                         return 'Full-screen Toggle (F11)'; // block manual FS exit

  // ── Clipboard operations ───────────────────────────────────────────────────
  if (ctrl && key === 'C')                   return 'Copy (Ctrl+C)';
  if (ctrl && key === 'V')                   return 'Paste (Ctrl+V)';
  if (ctrl && key === 'X')                   return 'Cut (Ctrl+X)';

  // ── Selection & document ──────────────────────────────────────────────────
  if (ctrl && key === 'A')                   return 'Select All (Ctrl+A)';
  if (ctrl && key === 'Z')                   return 'Undo (Ctrl+Z)';
  if (ctrl && key === 'Y')                   return 'Redo (Ctrl+Y)';
  if (ctrl && key === 'P')                   return 'Print (Ctrl+P)';
  if (ctrl && key === 'S')                   return 'Save (Ctrl+S)';

  // ── Navigation (browser) ──────────────────────────────────────────────────
  if (ctrl && key === 'T')                   return 'New Tab (Ctrl+T)';
  if (ctrl && key === 'N')                   return 'New Window (Ctrl+N)';
  if (ctrl && key === 'W')                   return 'Close Tab (Ctrl+W)';
  if (ctrl && key === 'R')                   return 'Refresh (Ctrl+R)';
  if (ctrl && key === 'L')                   return 'Address Bar (Ctrl+L)';
  if (key === 'F5')                           return 'Refresh (F5)';

  // ── Screenshot ────────────────────────────────────────────────────────────
  if (code === 'PrintScreen')                return 'Screenshot (PrintScreen)';
  if (alt  && code === 'PrintScreen')        return 'Screenshot (Alt+PrintScreen)';
  if (ctrl && shift && code === 'PrintScreen') return 'Screenshot Shortcut';
  if (ctrl && shift && key === 'S')          return 'Screenshot (Ctrl+Shift+S)';

  // ── OS-level switches (Alt+Tab, Windows key) cannot be caught via keydown.
  //    They are detected via visibilitychange / window blur below.
  // Alt+F4 — try to intercept the Alt key combo before OS steals it
  if (alt && key === 'F4')                   return 'Close App (Alt+F4)';

  // ── Find in page (silent block — no alert) ────────────────────────────────
  // We block Ctrl+F without flagging it as a cheat
  if (ctrl && key === 'F')                   return '__SILENT__';

  return null; // Not a cheat — allow
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ScreenProctor() {
  const navigate = useNavigate();

  // Read initial count from sessionStorage (persists across module navigations)
  const alertCountRef = useRef(() => {
    const stored = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
    return isNaN(stored) ? 0 : stored;
  });
  // Initialise the ref with the factory result immediately
  if (typeof alertCountRef.current === 'function') {
    alertCountRef.current = alertCountRef.current();
  }

  const [bannerMsg,     setBannerMsg]     = useState('');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [alertCount,    setAlertCount]    = useState(alertCountRef.current);
  const [showTerminate, setShowTerminate] = useState(false);
  const [exitBanner,    setExitBanner]    = useState(false); // full-screen exit banner

  const bannerTimerRef    = useRef(null);
  const exitBannerTimerRef = useRef(null);
  const terminatedRef     = useRef(false);

  // ─── Persist alert count ──────────────────────────────────────────────────
  const persistCount = useCallback((count) => {
    sessionStorage.setItem(SESSION_KEY, String(count));
  }, []);

  // ─── Fire an alert banner ─────────────────────────────────────────────────
  const fireAlert = useCallback((label) => {
    if (terminatedRef.current) return;

    const newCount = alertCountRef.current + 1;
    alertCountRef.current = newCount;
    persistCount(newCount);
    setAlertCount(newCount);

    setBannerMsg(`🚫 Blocked: ${label}   —   Alert ${newCount}/${MAX_ALERTS}`);
    setBannerVisible(true);

    clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setBannerVisible(false), BANNER_DURATION);

    // Terminate session when limit reached
    if (newCount >= MAX_ALERTS) {
      terminatedRef.current = true;
      setShowTerminate(true);
    }
  }, [persistCount]);

  // ─── Request full-screen ──────────────────────────────────────────────────
  const enterFullScreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen)            el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen)    el.mozRequestFullScreen();
    else if (el.msRequestFullscreen)     el.msRequestFullscreen();
  }, []);

  // ─── Handle full-screen exit ──────────────────────────────────────────────
  const handleFullscreenChange = useCallback(() => {
    if (terminatedRef.current) return;

    const isFullscreen =
      !!document.fullscreenElement       ||
      !!document.webkitFullscreenElement ||
      !!document.mozFullScreenElement    ||
      !!document.msFullscreenElement;

    if (!isFullscreen) {
      // Re-enter full-screen immediately
      setTimeout(() => enterFullScreen(), 100);

      // Show exit banner
      setExitBanner(true);
      clearTimeout(exitBannerTimerRef.current);
      exitBannerTimerRef.current = setTimeout(() => setExitBanner(false), 3500);

      // Count as a violation
      fireAlert('Exiting Full-Screen');
    }
  }, [enterFullScreen, fireAlert]);

  // ─── Handle keyboard cheats ───────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    // Allow events originating from file inputs (Resume upload)
    if (e.target?.type === 'file') return;

    const label = getCheatLabel(e);
    if (label === null) return; // allowed key — pass through

    // Always prevent the default browser action
    e.preventDefault();
    e.stopPropagation();

    if (label === '__SILENT__') return; // Ctrl+F — block silently, no alert

    fireAlert(label);
  }, [fireAlert]);

  // ─── Detect Alt+Tab / Windows key via visibility & focus loss ────────────
  // The OS steals Alt+Tab and Win key before keydown fires. The reliable way to
  // catch them is to listen for when the tab becomes hidden or the window loses
  // focus. We use a short debounce so one switch only counts as ONE violation.
  const switchCooldownRef = useRef(false);

  const handleVisibilityChange = useCallback(() => {
    if (terminatedRef.current) return;
    if (document.hidden) {
      if (switchCooldownRef.current) return;
      switchCooldownRef.current = true;
      setTimeout(() => { switchCooldownRef.current = false; }, 1500);
      fireAlert('Tab / Window Switch (Alt+Tab or Win Key)');
    }
  }, [fireAlert]);

  const handleWindowBlur = useCallback(() => {
    if (terminatedRef.current) return;
    // Only fire if the page is also hidden (true app-switch), not just a
    // DevTools panel or file-dialog gaining focus momentarily.
    // We give it a short delay to let visibilitychange fire first so they
    // don't double-count the same switch event.
    setTimeout(() => {
      if (document.hidden) return; // already handled by visibilitychange
      if (switchCooldownRef.current) return;
      switchCooldownRef.current = true;
      setTimeout(() => { switchCooldownRef.current = false; }, 1500);
      fireAlert('Window Focus Lost (Alt+Tab or Win Key)');
    }, 300);
  }, [fireAlert]);

  // ─── Mount / unmount effects ──────────────────────────────────────────────
  useEffect(() => {
    // Enter full-screen as soon as the component mounts
    enterFullScreen();

    // Listen for full-screen change
    document.addEventListener('fullscreenchange',       handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange',    handleFullscreenChange);
    document.addEventListener('MSFullscreenChange',     handleFullscreenChange);

    // Listen for keyboard cheats (capture phase so we get it before the page)
    document.addEventListener('keydown', handleKeyDown, true);

    // ── Detect Alt+Tab / Windows key (OS-level) via focus & visibility ──────
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Block right-click context menu
    const blockContext = (e) => e.preventDefault();
    document.addEventListener('contextmenu', blockContext);

    return () => {
      document.removeEventListener('fullscreenchange',       handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange',    handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange',     handleFullscreenChange);
      document.removeEventListener('keydown',      handleKeyDown, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', blockContext);
      clearTimeout(bannerTimerRef.current);
      clearTimeout(exitBannerTimerRef.current);
    };
  }, [enterFullScreen, handleFullscreenChange, handleKeyDown, handleVisibilityChange, handleWindowBlur]);

  // ─── Terminate → redirect to dashboard ───────────────────────────────────
  const handleTerminate = useCallback(() => {
    // Clear the session counter so next test starts fresh
    sessionStorage.removeItem(SESSION_KEY);
    navigate('/user/dashboard');
  }, [navigate]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Full-screen exit banner ─────────────────────────────────────── */}
      {exitBanner && (
        <div
          style={{
            position:       'fixed',
            top:            0,
            left:           0,
            right:          0,
            zIndex:         999999,
            background:     'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
            color:          '#fff',
            padding:        '14px 20px',
            textAlign:      'center',
            fontWeight:     800,
            fontSize:       '14px',
            letterSpacing:  '0.04em',
            boxShadow:      '0 4px 24px rgba(0,0,0,0.5)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '10px',
          }}
        >
          <span style={{ fontSize: '18px' }}>⚠️</span>
          Full-screen exited — returning you to secure mode. Please stay in full-screen.
        </div>
      )}

      {/* ── Cheat alert banner ──────────────────────────────────────────── */}
      {bannerVisible && (
        <div
          style={{
            position:        'fixed',
            top:             exitBanner ? '52px' : '0',
            left:            0,
            right:           0,
            zIndex:          999998,
            background:      'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color:           '#fff',
            padding:         '13px 20px',
            textAlign:       'center',
            fontWeight:      700,
            fontSize:        '13px',
            letterSpacing:   '0.03em',
            boxShadow:       '0 4px 24px rgba(0,0,0,0.45)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             '10px',
            transition:      'top 0.2s ease',
          }}
        >
          <span style={{ fontSize: '16px' }}>🚫</span>
          {bannerMsg}
          <span
            style={{
              marginLeft:     'auto',
              background:     alertCount >= MAX_ALERTS * 0.8
                ? 'rgba(239,68,68,0.3)'
                : 'rgba(255,255,255,0.12)',
              border:         `1px solid ${alertCount >= MAX_ALERTS * 0.8 ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius:   '20px',
              padding:        '2px 12px',
              fontSize:       '11px',
              fontWeight:     900,
              letterSpacing:  '0.08em',
              color:          alertCount >= MAX_ALERTS * 0.8 ? '#fca5a5' : '#c7d2fe',
            }}
          >
            {alertCount}/{MAX_ALERTS} ALERTS
          </span>
        </div>
      )}

      {/* ── Persistent mini badge (always visible, bottom-center) ─────── */}
      <div
        style={{
          position:       'fixed',
          bottom:         '20px',
          left:           '50%',
          transform:      'translateX(-50%)',
          zIndex:         99997,
          background:     alertCount > 0
            ? 'rgba(30, 27, 75, 0.92)'
            : 'rgba(20, 69, 66, 0.88)',
          border:         `1px solid ${alertCount > 0
            ? 'rgba(99,102,241,0.4)'
            : 'rgba(16,185,129,0.4)'}`,
          borderRadius:   '999px',
          padding:        '6px 16px',
          display:        'flex',
          alignItems:     'center',
          gap:            '8px',
          backdropFilter: 'blur(8px)',
          color:          '#fff',
          fontSize:       '11px',
          fontWeight:     800,
          letterSpacing:  '0.1em',
          textTransform:  'uppercase',
          userSelect:     'none',
          pointerEvents:  'none',
          whiteSpace:     'nowrap',
        }}
      >
        <span
          style={{
            width:        '7px',
            height:       '7px',
            borderRadius: '50%',
            background:   alertCount > 0 ? '#818cf8' : '#10b981',
            boxShadow:    alertCount > 0
              ? '0 0 6px #818cf8'
              : '0 0 6px #10b981',
            animation:    'pulse 1.8s ease-in-out infinite',
          }}
        />
        🔒 Screen Proctor
        {alertCount > 0 && (
          <span
            style={{
              background:   alertCount >= MAX_ALERTS * 0.8
                ? 'rgba(239,68,68,0.25)'
                : 'rgba(129,140,248,0.25)',
              border:       `1px solid ${alertCount >= MAX_ALERTS * 0.8
                ? 'rgba(239,68,68,0.4)'
                : 'rgba(129,140,248,0.3)'}`,
              borderRadius: '999px',
              padding:      '1px 8px',
              color:        alertCount >= MAX_ALERTS * 0.8 ? '#fca5a5' : '#c7d2fe',
            }}
          >
            {alertCount}/{MAX_ALERTS}
          </span>
        )}
      </div>

      {/* ── Session Terminated Modal ────────────────────────────────────── */}
      {showTerminate && (
        <div
          style={{
            position:       'fixed',
            inset:          0,
            zIndex:         9999999,
            background:     'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(12px)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background:   '#fff',
              borderRadius: '24px',
              padding:      '48px 40px',
              maxWidth:     '460px',
              width:        '90%',
              textAlign:    'center',
              boxShadow:    '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '54px', marginBottom: '16px' }}>🚫</div>
            <h2
              style={{
                fontSize:     '22px',
                fontWeight:   900,
                color:        '#1e293b',
                marginBottom: '10px',
              }}
            >
              Session Terminated
            </h2>
            <p
              style={{
                color:        '#64748b',
                fontSize:     '14px',
                marginBottom: '8px',
                lineHeight:   '1.6',
              }}
            >
              You have reached the maximum of{' '}
              <strong style={{ color: '#ef4444' }}>{MAX_ALERTS} integrity alerts</strong>.
              Your session has been automatically terminated.
            </p>
            <p
              style={{
                color:        '#94a3b8',
                fontSize:     '12px',
                marginBottom: '28px',
              }}
            >
              Total keyboard/screen violations recorded: {alertCount}
            </p>
            <button
              onClick={handleTerminate}
              style={{
                width:         '100%',
                padding:       '14px',
                background:    'linear-gradient(135deg, #144542 0%, #1b5b53 100%)',
                color:         '#fff',
                border:        'none',
                borderRadius:  '12px',
                fontSize:      '15px',
                fontWeight:    900,
                letterSpacing: '0.04em',
                cursor:        'pointer',
                transition:    'opacity 0.2s',
              }}
              onMouseOver={e  => (e.target.style.opacity = '0.88')}
              onMouseOut ={e  => (e.target.style.opacity = '1')}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
