/* Opening-time cafe: decorative motion never reads or changes the player's save. */
(function () {
  'use strict';
  const base = document.currentScript.src, backgrounds = new Map();
  function loadBackground(portrait) {
    const file = portrait ? 'title-cafe-mobile.png' : 'title-cafe.png';
    if (backgrounds.has(file)) return backgrounds.get(file);
    const image = new Image();
    const ready = new Promise(resolve => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = new URL('./' + file + '?v=20261012', base).href;
    });
    const background = { image, ready }; backgrounds.set(file, background); return background;
  }
  function mount(canvas, greeting, motionButton) {
    const g = canvas.getContext('2d');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let sprites, background, stopped = false, running = !preference.matches, frameId = 0;
    let width = 1, height = 1, scale = 1, offsetX = 0, offsetY = 0;
    let grioX = 680, pontaX = 890, lift = 0, landscape = false;
    const menu = canvas.closest('.title-screen').querySelector('.title-menu');
    let last = 0, time = 0, reactionUntil = 0, down = null, hitAreas = [];
    const t0 = performance.now();
    const greetings = ['いらっしゃいませ、だにゃ。', 'コーヒー、もうすぐできるにゃ。', 'ぽんた、開店前から寝てるにゃ…', '今日は、どんなお店にしよう？'];
    function sprite(pal, pose, x, y, size, face = 1) {
      const image = sprites?.[pal]?.[pose];
      if (!image) return;
      hitAreas.push({ x: x - size / 2, y: y - size * 144 / 128, width: size, height: size * 144 / 128 });
      g.fillStyle = 'rgba(66,40,23,.18)';
      g.beginPath(); g.ellipse(x, y - 3, size * .25, 10, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(x, y);
      if (face < 0) g.scale(-1, 1);
      window.SpriteRaster.draw(g, image, -size / 2, -size * 144 / 128, size, size * 144 / 128);
      g.restore();
    }
    function draw(t) {
      hitAreas = [];
      g.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      g.fillStyle = '#e7cba6'; g.fillRect(0, 0, width, height);
      const backdrop = background?.image;
      const loaded = backdrop?.complete && backdrop.naturalWidth;
      if (loaded) {
        const fit = Math.max(width / backdrop.naturalWidth, height / backdrop.naturalHeight);
        g.imageSmoothingEnabled = false;
        g.drawImage(backdrop, (width - backdrop.naturalWidth * fit) / 2, (height - backdrop.naturalHeight * fit) / 2, backdrop.naturalWidth * fit, backdrop.naturalHeight * fit);
      }
      g.save(); g.translate(offsetX, offsetY); g.scale(scale, scale);
      g.imageSmoothingEnabled = false;
      if (!loaded) {
        g.fillStyle = '#efe0c3'; g.fillRect(0, 0, 1536, 430);
        g.fillStyle = '#c49360'; g.fillRect(0, 430, 1536, 594);
        g.fillStyle = '#b08051'; for (let y = 460; y < 1024; y += 44) g.fillRect(0, y, 1536, 3);
      }
      // Warm window light and slow drifting specks, behind the cats.
      for (let i = 0; i < 13; i++) {
        const phase = (t * .045 + i / 13) % 1;
        g.fillStyle = `rgba(255,243,186,${Math.sin(phase * Math.PI) * .6})`;
        g.fillRect(440 + i * 44 + Math.sin(t * .5 + i) * 12, 340 + phase * 360, 4, 4);
      }
      const x = grioX;
      const grioY = 728 - lift;
      sprite('grio', reactionUntil > t ? 'joy' : 'coffee', x, grioY, 178);
      if (reactionUntil <= t) {
        const cupX = x + 42, cupY = grioY - 100;
        for (let i = 0; i < 3; i++) {
          const p = (t * .5 + i / 3) % 1;
          g.fillStyle = `rgba(255,252,235,${(1 - p) * .65})`;
          g.fillRect(cupX + Math.sin(p * 5 + i) * 5, cupY + 8 - p * 33, 3, 5);
        }
      }
      const rest = t % 16, pontaPose = reactionUntil > t ? 'joy' : rest < 9 ? 'sleepbag' : rest < 13 ? 'groom' : 'sit';
      sprite('ponta', pontaPose, pontaX, 808 - lift, 172, -1);
      if (rest < 9 && reactionUntil <= t) {
        const p = (t * .35) % 1;
        g.globalAlpha = 1 - p; g.fillStyle = '#fff6db'; g.font = 'bold 24px monospace';
        g.fillText('z', pontaX + 49 + p * 9, 685 - lift - p * 28); g.globalAlpha = 1;
      }
      if (reactionUntil > t) {
        g.fillStyle = '#e49b94'; g.font = '32px serif'; g.fillText('♥', x + 58, 560 - lift - Math.sin(t * 5) * 6);
      }
      g.restore();
      greeting.textContent = reactionUntil > t ? 'なでてくれて、ありがとにゃ！' : greetings[Math.floor(t / 6) % greetings.length];
      // Keep the bubble and its tail attached to Grio at every screen size.
      const anchor = offsetX + x * scale, bubbleWidth = Math.min(286, width - 24);
      const center = Math.max(12 + bubbleWidth / 2, Math.min(width - 12 - bubbleWidth / 2, anchor));
      greeting.classList.toggle('below', landscape);
      greeting.style.left = center + 'px';
      greeting.style.top = (offsetY + (landscape ? grioY + 44 : grioY - 178 * 144 / 128 - 18) * scale) + 'px';
      greeting.style.setProperty('--tail-x', (anchor - center + bubbleWidth / 2) + 'px');
      canvas.dataset.frame = String(Math.round(t * 30));
    }
    function resize() {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width); height = Math.max(1, box.height);
      const selected = loadBackground(width < height);
      if (background !== selected) {
        background = selected;
        canvas.dataset.background = width < height ? 'portrait' : 'landscape';
        canvas.dataset.backgroundReady = selected.image.complete ? (selected.image.naturalWidth ? 'true' : 'fallback') : 'loading';
        selected.ready.then(loaded => {
          if (!stopped && background === selected) { canvas.dataset.backgroundReady = loaded ? 'true' : 'fallback'; draw(time); }
        });
      }
      window.SpriteRaster.resize(canvas, width, height, Math.min(devicePixelRatio || 1, 2));
      scale = Math.max(width / 1536, height / 1024);
      offsetX = (width - 1536 * scale) / 2; offsetY = (height - 1024 * scale) / 2;
      landscape = width >= 600 && height <= 500;
      grioX = landscape ? 750 : 680; pontaX = 890;
      lift = height < 650 && width < 600 ? 85 : 0;
      // Reserve the actual menu, including both buttons when a save exists.
      // Recompute only for layout changes so animation never moves the cats.
      const bounds = menu.getBoundingClientRect(), canvasBounds = canvas.getBoundingClientRect();
      if (width >= 600 && width > height) {
        const right = offsetX + (pontaX + 172 / 2) * scale;
        const shift = Math.max(0, (right - (bounds.left - canvasBounds.left - 16)) / scale);
        grioX -= shift; pontaX -= shift;
      } else {
        lift = Math.max(lift, (offsetY + 808 * scale - (bounds.top - canvasBounds.top - 16)) / scale);
      }
      draw(time);
    }
    function frame(now) {
      if (stopped) return;
      frameId = requestAnimationFrame(frame);
      if (!running || document.hidden || now - last < 1000 / 30) return;
      time += last ? Math.min((now - last) / 1000, .1) : Math.min((now - t0) / 1000, .1);
      last = now; draw(time);
    }
    function setMotion(enabled) {
      running = enabled; last = 0;
      motionButton.textContent = enabled ? '動き ON' : '動き OFF';
      motionButton.setAttribute('aria-pressed', String(enabled));
      canvas.dataset.motion = enabled ? 'on' : 'off';
      draw(time);
    }
    const toggle = () => setMotion(!running);
    const changePreference = () => setMotion(!preference.matches);
    const pointerDown = e => { if (e.isPrimary) down = { x: e.clientX, y: e.clientY }; };
    const pointerCancel = () => { down = null; };
    const pointerUp = e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) { down = null; return; }
      down = null;
      const box = canvas.getBoundingClientRect();
      const x = (e.clientX - box.left - offsetX) / scale, y = (e.clientY - box.top - offsetY) / scale;
      if (hitAreas.some(r => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height)) { reactionUntil = time + 2; draw(time); }
    };
    canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerCancel);
    motionButton.addEventListener('click', toggle); preference.addEventListener('change', changePreference);
    const observer = new ResizeObserver(resize); observer.observe(canvas); observer.observe(menu);
    resize();
    const ready = Promise.all([background.ready, window.CatMotions.load]).then(([, loaded]) => {
      if (stopped) return;
      sprites = loaded; canvas.dataset.ready = 'true'; draw(time);
    }).catch(() => { if (!stopped) { canvas.dataset.ready = 'fallback'; draw(time); } });
    setMotion(running); frameId = requestAnimationFrame(frame);
    return { ready, stop() {
      stopped = true; cancelAnimationFrame(frameId); observer.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      motionButton.removeEventListener('click', toggle); preference.removeEventListener('change', changePreference);
    } };
  }
  window.TitleScene = { mount };
})();
