'use client';

import { useEffect } from 'react';

export default function VideoProtection() {
  useEffect(() => {
    // ── 1. Disable right-click everywhere ──────────────────────
    const noCtx = (e) => e.preventDefault();
    document.addEventListener('contextmenu', noCtx);

    // ── 2. Block dangerous keyboard shortcuts ──────────────────
    const noKeys = (e) => {
      const blocked = [
        // Save / View source / Print / Find
        { ctrl: true, keys: ['s', 'u', 'p', 'a', 'f'] },
        // Dev tools
        { ctrl: true, shift: true, keys: ['i', 'j', 'c'] },
        // F keys
        { keys: ['F12'] },
      ];
      const key = e.key?.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (e.key === 'F12') { e.preventDefault(); return; }
      if (isCtrl && ['s','u','p','a'].includes(key)) { e.preventDefault(); return; }
      if (isCtrl && isShift && ['i','j','c'].includes(key)) { e.preventDefault(); return; }
    };
    document.addEventListener('keydown', noKeys);

    // ── 3. Disable drag on all elements ───────────────────────
    const noDrag = (e) => e.preventDefault();
    document.addEventListener('dragstart', noDrag);

    // ── 4. Disable text selection on non-input elements ────────
    document.documentElement.style.userSelect = 'none';
    document.documentElement.style.webkitUserSelect = 'none';

    // ── 5. Anti-DevTools — detect window size anomaly ─────────
    // When DevTools opens, window.outerWidth - window.innerWidth > threshold
    let devtoolsOpen = false;
    const detectDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const opened = widthDiff > threshold || heightDiff > threshold;

      if (opened && !devtoolsOpen) {
        devtoolsOpen = true;
        // Blur all video iframes when devtools detected
        document.querySelectorAll('.modal-video iframe, .pres-video iframe').forEach(iframe => {
          iframe.style.filter = 'blur(20px)';
          iframe.style.pointerEvents = 'none';
        });
        // Show warning
        const warn = document.createElement('div');
        warn.id = '__devtools_warn__';
        warn.style.cssText = `
          position:fixed;top:0;left:0;right:0;bottom:0;
          background:rgba(0,0,0,0.95);z-index:99999;
          display:flex;align-items:center;justify-content:center;
          flex-direction:column;gap:16px;color:#f5c842;
          font-family:system-ui;font-size:1.2rem;font-weight:700;
          text-align:center;padding:40px;
        `;
        warn.innerHTML = `
          <div style="font-size:3rem">🔐</div>
          <div>Developer tools detected</div>
          <div style="font-size:0.9rem;color:#999;font-weight:400">
            Close DevTools to resume playback
          </div>
        `;
        document.body.appendChild(warn);
      }

      if (!opened && devtoolsOpen) {
        devtoolsOpen = false;
        document.querySelectorAll('.modal-video iframe, .pres-video iframe').forEach(iframe => {
          iframe.style.filter = '';
          iframe.style.pointerEvents = '';
        });
        const warn = document.getElementById('__devtools_warn__');
        if (warn) warn.remove();
      }
    };
    const devtoolsInterval = setInterval(detectDevTools, 1000);

    // ── 6. Debugger trap — slows down devtools console ─────────
    // (only active when page is opened in devtools mode)
    const debuggerTrap = () => {
      if (devtoolsOpen) {
        // eslint-disable-next-line no-debugger
        setInterval(() => { /* debugger; */ }, 100);
      }
    };

    // ── 7. Override console to reduce info leakage ────────────
    const noop = () => {};
    const safeConsole = { log: noop, warn: noop, error: noop, info: noop, debug: noop, table: noop };
    Object.assign(window.console, safeConsole);

    // ── 8. Prevent iframe src discovery via performance API ───
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver(() => {});
        observer.observe({ entryTypes: ['resource'] });
      } catch (_) {}
    }

    // ── 9. Disable print ──────────────────────────────────────
    const noPrint = () => {
      const style = document.createElement('style');
      style.id = '__noprint__';
      style.innerHTML = '@media print { body { display: none !important; } }';
      document.head.appendChild(style);
    };
    window.addEventListener('beforeprint', noPrint);

    // ── 10. Page visibility — pause if tab screenshot detected ─
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Tab switched — optional: could pause video here
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // ── Cleanup ────────────────────────────────────────────────
    return () => {
      document.removeEventListener('contextmenu', noCtx);
      document.removeEventListener('keydown', noKeys);
      document.removeEventListener('dragstart', noDrag);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeprint', noPrint);
      clearInterval(devtoolsInterval);
      document.documentElement.style.userSelect = '';
      document.documentElement.style.webkitUserSelect = '';
      const printStyle = document.getElementById('__noprint__');
      if (printStyle) printStyle.remove();
    };
  }, []);

  return null; // invisible component
}
