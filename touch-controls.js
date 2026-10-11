/* Safari/WKWebView can still double-tap zoom despite viewport and CSS hints.
 * Cancel the native end-of-tap default. Buttons receive one explicit click;
 * cafe acts on pointerup; kitchen/dialogue on pointerdown. Leave scrolling and pinch alone. */
(() => {
  'use strict';
  let tap = null;
  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { tap = null; return; }
    const t = event.touches[0];
    tap = { x: t.clientX, y: t.clientY, target: event.target, moved: false };
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', event => {
    if (!tap) return;
    if (event.touches.length !== 1) { tap = null; return; }
    const t = event.touches[0];
    if (Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 10) tap.moved = true;
  }, { capture: true, passive: true });
  document.addEventListener('touchend', event => {
    const ended = tap; tap = null;
    if (!ended || ended.moved || event.touches.length || event.changedTouches.length !== 1) return;
    const t = event.changedTouches[0];
    if (Math.hypot(t.clientX - ended.x, t.clientY - ended.y) > 10) return;
    const target = ended.target instanceof Element ? ended.target : ended.target.parentElement;
    // Preserve native form editing and links if future panels add them.
    if (!target || target.closest('input,textarea,select,a,[contenteditable="true"]')) return;
    if (!event.cancelable) return;
    event.preventDefault();
    const button = target.closest('button');
    if (button && !button.disabled && button.isConnected) {
      const released = document.elementFromPoint(t.clientX, t.clientY);
      if (released && button.contains(released)) button.click();
    }
  }, { capture: true, passive: false });
  document.addEventListener('touchcancel', () => { tap = null; }, { capture: true, passive: true });
  document.addEventListener('dblclick', event => {
    if (!event.target.closest('input,textarea,select,a,[contenteditable="true"]')) event.preventDefault();
  }, { capture: true });
})();
