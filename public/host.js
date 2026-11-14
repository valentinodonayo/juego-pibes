(function () {
  const $ = (id) => document.getElementById(id);
  const cv = $('cv'), g = cv.getContext('2d');
  const { WORLD } = Tracks;
  const POWER_ICON = '?';
  let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
  let room = null, tk = null, bg = null, ws = null;
  let prev = null, cur = null, racers = [], effects = [], lastCount = null;
  let demo = new URLSearchParams(location.search).get('demo');

  // ---------- Conexión ----------
  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'host', code: sessionStorage.getItem('room') || '' }));
    ws.onclose = () => setTimeout(connect, 1000);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.t === 'lobby') onLobby(m);
      else if (m.t === 's') {
        prev = cur; cur = m; cur.at = performance.now();
        for (const ev of m.ev || []) effects.push({ k: ev.k, x: ev.x, y: ev.y, at: cur.at });
      }
    };
  }
  const send = (m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));

  let joinBase = null;
  async function joinUrl(code) {
    if (!joinBase) {
      joinBase = location.origin;
      if (['localhost', '127.0.0.1'].includes(location.hostname)) {
        try {
          const info = await (await fetch('/info')).json();
          if (info.lan.length) joinBase = 'http://' + info.lan[0] + ':' + info.port;
        } catch (e) { /* se usa location.origin */ }
      }
    }
    return joinBase + '/play?r=' + code;
  }

  function card(p, extra) {
    const d = document.createElement('div');
    d.className = 'pcard' + (p.on === false ? ' off' : '');
    d.style.borderLeftColor = Cars.COLORS[p.color];
    const c = document.createElement('canvas');
    c.width = 152; c.height = 92;
    Cars.draw(c.getContext('2d'), p.car, p.color, 76, 46, 0, 2);
    d.appendChild(c);
    d.insertAdjacentHTML('beforeend', extra || '');
    const s = document.createElement('span');
    s.textContent = p.name + (p.leader ? ' 👑' : '');
    d.appendChild(s);
    return d;
  }

  async function onLobby(m) {
    const first = !room;
    const trackChanged = !room || room.track !== m.track;
    room = m;
    sessionStorage.setItem('room', m.code);
    if (trackChanged) { tk = Tracks.build(m.track); renderBg(); }
    if (m.state === 'race') {
      const byId = {};
      m.players.forEach((p) => (byId[p.pid] = p));
      racers = m.racers.map((pid) => byId[pid] || { name: '?', car: 0, color: 0 });
    } else {
      prev = cur = null; effects = [];
    }
    $('lobby').classList.toggle('hidden', m.state !== 'lobby');
    $('results').classList.toggle('hidden', m.state !== 'results');
    $('code').textContent = m.code;
    $('track').textContent = m.tracks[m.track];
    $('laps').textContent = m.laps;
    $('bots').textContent = m.players.filter((p) => p.bot).length;
    $('pcount').textContent = m.players.length;
    $('empty').classList.toggle('hidden', m.players.length > 0);
    $('start').disabled = !m.players.some((p) => p.on);
    $('plist').replaceChildren(...m.players.map((p) => card(p)));
    if (m.results) {
      $('rlist').replaceChildren(...m.results.map((r, i) => {
        const d = card(r, '<b>' + (i + 1) + '°</b>');
        const t = document.createElement('em');
        t.textContent = r.time == null ? 'No llegó' : fmt(r.time);
        d.appendChild(t);
        return d;
      }));
    }
    const url = await joinUrl(m.code);
    if ($('url').textContent !== url) {
      $('url').textContent = url;
      $('qr').src = '/qr?t=' + encodeURIComponent(url);
    }
    if (first && demo && m.state === 'lobby') {
      send({ t: 'cfg', bots: Number(demo) || 6, track: Number(new URLSearchParams(location.search).get('track')) || 0 });
      send({ t: 'start' });
    }
  }

  document.querySelectorAll('[data-cfg]').forEach((b) => b.addEventListener('click', () => {
    if (!room) return;
    const k = b.dataset.cfg, d = Number(b.dataset.d);
    const curv = k === 'bots' ? room.players.filter((p) => p.bot).length : room[k];
    send({ t: 'cfg', [k]: curv + d });
  }));
  $('start').onclick = () => { beep(0); send({ t: 'start' }); };
  $('again').onclick = () => send({ t: 'lobby' });
  $('fs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  document.addEventListener('fullscreenchange', () => $('fs').classList.toggle('hidden', !!document.fullscreenElement));

  function fmt(t) {
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  // ---------- Sonido ----------
  let audio = null;
  function beep(freq, dur) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (!freq) return;
      const o = audio.createOscillator(), v = audio.createGain();
      o.frequency.value = freq; o.type = 'square';
      v.gain.setValueAtTime(0.08, audio.currentTime);
      v.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + (dur || 0.2));
      o.connect(v); v.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + (dur || 0.2));
    } catch (e) { /* sin audio */ }
  }

  // ---------- Dibujo de la pista ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    scale = Math.min(W / WORLD.w, H / WORLD.h);
    ox = (W - WORLD.w * scale) / 2; oy = (H - WORLD.h * scale) / 2;
    if (tk) renderBg();
  }
  window.addEventListener('resize', resize);

  function worldTransform(c) {
    c.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
  }

  function rng(seed) {
    let s = seed;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function renderBg() {
    bg = document.createElement('canvas');
    bg.width = cv.width; bg.height = cv.height;
    const c = bg.getContext('2d');
    c.fillStyle = '#6f9a3e';
    c.fillRect(0, 0, bg.width, bg.height);
    worldTransform(c);
    c.fillStyle = '#86b049';
    c.fillRect(0, 0, WORLD.w, WORLD.h);
    const rnd = rng(tk.index * 977 + 13);
    for (let i = 0; i < 60; i++) {
      c.fillStyle = i % 2 ? 'rgba(60,110,40,.25)' : 'rgba(170,200,90,.25)';
      c.beginPath();
      c.ellipse(rnd() * WORLD.w, rnd() * WORLD.h, 60 + rnd() * 160, 40 + rnd() * 90, rnd() * 3, 0, 7);
      c.fill();
    }
    const path = () => {
      c.beginPath();
      c.moveTo(tk.x[0], tk.y[0]);
      for (let i = 1; i < tk.N; i++) c.lineTo(tk.x[i], tk.y[i]);
      c.closePath();
    };
    c.lineJoin = 'round';
    const w = tk.width, full = w + tk.runoff * 2;
    path(); c.strokeStyle = '#4b5d2e'; c.lineWidth = full + 14; c.stroke();
    path(); c.strokeStyle = '#ead9a7'; c.lineWidth = full; c.stroke();
    path(); c.strokeStyle = '#fff'; c.lineWidth = w + 26; c.stroke();
    path(); c.strokeStyle = '#d32f2f'; c.lineWidth = w + 26; c.setLineDash([36, 36]); c.stroke(); c.setLineDash([]);
    path(); c.strokeStyle = '#3b3f45'; c.lineWidth = w; c.stroke();
    path(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.setLineDash([34, 46]); c.stroke(); c.setLineDash([]);
    // Línea de largada
    c.save();
    c.translate(tk.x[0], tk.y[0]);
    c.rotate(Math.atan2(tk.ty[0], tk.tx[0]));
    const n = 10, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      c.fillStyle = (i + j) % 2 ? '#111' : '#fff';
      c.fillRect(-s + j * s, -w / 2 + i * s, s, s);
    }
    c.restore();
    // Árboles lejos de la pista
    const limit = w / 2 + tk.runoff + 70;
    for (let i = 0, placed = 0; i < 600 && placed < 90; i++) {
      const x = rnd() * WORLD.w, y = rnd() * WORLD.h;
      let ok = true;
      for (let k = 0; k < tk.N; k += 3) {
        const dx = x - tk.x[k], dy = y - tk.y[k];
        if (dx * dx + dy * dy < limit * limit) { ok = false; break; }
      }
      if (!ok) continue;
      placed++;
      const r = 26 + rnd() * 22;
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(x + 8, y + 10, r, 0, 7); c.fill();
      c.fillStyle = '#3f7d2c'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.fillStyle = '#56a03a'; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.25, r * 0.6, 0, 7); c.fill();
    }
  }

  // ---------- Bucle de dibujo ----------
  function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return a + d * t;
  }

  function frame() {
    requestAnimationFrame(frame);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (bg) g.drawImage(bg, 0, 0);
    if (!room || room.state !== 'race' || !cur) return;
    const now = performance.now();
    const a = prev || cur;
    const span = Math.max(1, cur.at - a.at);
    const f = prev ? Math.min(1.5, (now - cur.at) / span) : 1;
    const tm = cur.tm + Math.min(0.1, (now - cur.at) / 1000);
    worldTransform(g);

    // Manchas de aceite
    for (const o of cur.o) {
      g.fillStyle = 'rgba(15,15,20,.85)';
      g.beginPath(); g.ellipse(o[0], o[1], 34, 26, 0.5, 0, 7); g.fill();
      g.beginPath(); g.ellipse(o[0] + 22, o[1] - 14, 13, 10, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.beginPath(); g.ellipse(o[0] - 8, o[1] - 8, 9, 5, 0.5, 0, 7); g.fill();
    }
    // Cajas de poderes
    const bob = Math.sin(now / 200) * 3;
    for (let i = 0; i < tk.items.length; i++) {
      if (cur.it[i] !== '1') continue;
      const it = tk.items[i];
      g.save();
      g.translate(it.x, it.y);
      g.rotate(now / 900 + i);
      g.fillStyle = '#ffca28'; g.strokeStyle = '#e65100'; g.lineWidth = 4;
      g.beginPath(); g.rect(-17 - bob / 2, -17 - bob / 2, 34 + bob, 34 + bob); g.fill(); g.stroke();
      g.rotate(-(now / 900 + i));
      g.fillStyle = '#bf360c'; g.font = '900 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(POWER_ICON, 0, 2);
      g.restore();
    }
    // Autos
    const pos = [];
    for (let i = 0; i < cur.c.length; i++) {
      const c1 = cur.c[i], c0 = (a.c[i] || c1), p = racers[i] || { car: 0, color: 0, name: '' };
      const x = c0[0] + (c1[0] - c0[0]) * f, y = c0[1] + (c1[1] - c0[1]) * f;
      const ang = c1[3] & 2 ? c1[2] : lerpAngle(c0[2], c1[2], Math.min(1, f));
      pos.push([x, y]);
      g.globalAlpha = c1[3] & 4 ? 0.45 : 1;
      if (c1[3] & 1) {
        g.save(); g.translate(x, y); g.rotate(ang); g.scale(1.5, 1.5);
        const l = 40 + Math.random() * 30;
        g.fillStyle = '#ff9800'; g.beginPath(); g.moveTo(-24, -9); g.lineTo(-24 - l, 0); g.lineTo(-24, 9); g.fill();
        g.fillStyle = '#ffeb3b'; g.beginPath(); g.moveTo(-24, -5); g.lineTo(-24 - l * 0.6, 0); g.lineTo(-24, 5); g.fill();
        g.restore();
      }
      Cars.draw(g, p.car, p.color, x, y, ang, 1.7);
      g.globalAlpha = 1;
    }
    // Efectos
    effects = effects.filter((e) => now - e.at < 600);
    for (const e of effects) {
      const t = (now - e.at) / 600;
      if (e.k === 'boom') {
        g.strokeStyle = 'rgba(255,235,59,' + (1 - t) + ')'; g.lineWidth = 14 * (1 - t) + 2;
        g.beginPath(); g.arc(e.x, e.y, 30 + 290 * t, 0, 7); g.stroke();
      } else if (t < 0.5) {
        g.fillStyle = 'rgba(255,255,255,' + (1 - t * 2) + ')';
        for (let k = 0; k < 6; k++) {
          const an = k * 1.05 + e.x;
          g.beginPath(); g.arc(e.x + Math.cos(an) * 50 * t, e.y + Math.sin(an) * 50 * t, 5, 0, 7); g.fill();
        }
      }
    }

    // Nombres y HUD en coordenadas de pantalla
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const fs = Math.max(11, Math.round(H / 62));
    g.font = '800 ' + fs + 'px system-ui';
    for (let i = 0; i < pos.length; i++) {
      const p = racers[i]; if (!p) continue;
      const sx = ox + pos[i][0] * scale, sy = oy + pos[i][1] * scale - 34 * scale - 4;
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(p.name, sx, sy);
      g.fillStyle = Cars.COLORS[p.color]; g.fillText(p.name, sx, sy);
    }
    // Tabla de posiciones
    const rh = Math.max(20, Math.round(H / 34)), pw = rh * 9.5;
    g.fillStyle = 'rgba(0,0,0,.55)';
    g.fillRect(10, 10, pw, rh * (cur.r.length + 1.4));
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = '800 ' + Math.round(rh * 0.62) + 'px system-ui';
    g.fillStyle = '#ffeb3b';
    g.fillText(room.tracks[room.track] + ' · ' + (tm > 0 ? fmt(tm) : '0:00.00'), 20, 10 + rh * 0.7);
    cur.r.forEach((ci, k) => {
      const p = racers[ci]; if (!p) return;
      const y = 10 + rh * (k + 1.9);
      g.fillStyle = '#fff'; g.fillText((k + 1) + '°', 20, y);
      g.fillStyle = Cars.COLORS[p.color]; g.fillRect(20 + rh * 1.5, y - rh * 0.3, rh * 0.25, rh * 0.6);
      g.fillStyle = '#fff'; g.fillText(p.name, 20 + rh * 2.1, y);
      g.textAlign = 'right';
      g.fillStyle = cur.c[ci][3] & 4 ? '#8bc34a' : '#ccc';
      g.fillText(cur.c[ci][3] & 4 ? '🏁' : 'V' + cur.lp[ci] + '/' + room.laps, pw, y);
      g.textAlign = 'left';
    });
    // Semáforo
    let label = null;
    if (tm < 0) label = tm > -3 ? String(Math.ceil(-tm)) : '';
    else if (tm < 1.2) label = '¡YA!';
    if (label !== lastCount) {
      if (label && label !== '') beep(label === '¡YA!' ? 880 : 440, label === '¡YA!' ? 0.6 : 0.2);
      lastCount = label;
    }
    if (label) {
      g.textAlign = 'center';
      g.font = '900 ' + Math.round(H / 3.2) + 'px system-ui';
      g.lineWidth = 12; g.strokeStyle = '#000'; g.strokeText(label, W / 2, H / 2);
      g.fillStyle = label === '¡YA!' ? '#8bc34a' : '#ffeb3b'; g.fillText(label, W / 2, H / 2);
    }
  }

  resize();
  connect();
  requestAnimationFrame(frame);
})();
