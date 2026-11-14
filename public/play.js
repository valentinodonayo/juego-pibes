(function () {
  const $ = (id) => document.getElementById(id);
  // Cada pestaña guarda su propio jugador; localStorage solo sirve de valor inicial
  const saved = (k) => sessionStorage.getItem(k) ?? localStorage.getItem(k);
  const params = new URLSearchParams(location.search);
  let code = (params.get('r') || '').toUpperCase();
  let name = saved('name') || '';
  let car = Number(saved('car') || Math.floor(Math.random() * Cars.count)) % Cars.count;
  let color = Number(saved('color') || Math.floor(Math.random() * Cars.COLORS.length)) % Cars.COLORS.length;
  let ws = null, pid = null, room = null, me = null, editing = true, wanted = false, steer = 0;

  // ---------- Selector de auto ----------
  $('iname').value = name;
  $('icode').value = code;
  $('codebox').classList.toggle('hidden', !!code);

  function buildPicker() {
    $('carname').textContent = Cars.names[car];
    $('grid').replaceChildren(...Cars.names.map((n, i) => {
      const d = document.createElement('div');
      if (i === car) d.className = 'sel';
      const c = document.createElement('canvas');
      c.width = 160; c.height = 100;
      Cars.draw(c.getContext('2d'), i, color, 80, 50, 0, 2);
      d.append(c, n);
      d.onclick = () => { car = i; buildPicker(); };
      return d;
    }));
    $('colors').replaceChildren(...Cars.COLORS.map((col, i) => {
      const s = document.createElement('i');
      s.style.background = col;
      if (i === color) s.className = 'sel';
      s.onclick = () => { color = i; buildPicker(); };
      return s;
    }));
  }
  buildPicker();

  $('go').onclick = () => {
    code = ($('icode').value || code).trim().toUpperCase();
    name = $('iname').value.trim() || 'Pibe';
    if (code.length !== 4) { $('err').textContent = 'Poné el código de 4 letras de la pantalla'; return; }
    for (const st of [sessionStorage, localStorage]) {
      st.setItem('name', name);
      st.setItem('car', car);
      st.setItem('color', color);
    }
    $('err').textContent = '';
    editing = false;
    wanted = true;
    if (ws && ws.readyState === 1) join(); else connect();
    try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) { /* no disponible */ }
  };
  $('change').onclick = () => { editing = true; show(); };

  // ---------- Conexión ----------
  function join() {
    pid = pid || sessionStorage.getItem('pid-' + code);
    ws.send(JSON.stringify({ t: 'join', code, name, car, color, pid, key: sessionStorage.getItem('key-' + code) }));
  }
  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = join;
    ws.onclose = () => { if (wanted) setTimeout(connect, 1000); };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.t === 'joined') { pid = m.pid; sessionStorage.setItem('pid-' + code, pid); sessionStorage.setItem('key-' + code, m.key); }
      else if (m.t === 'err') { wanted = false; editing = true; pid = null; sessionStorage.removeItem('pid-' + code); $('err').textContent = m.msg; $('codebox').classList.remove('hidden'); show(); }
      else if (m.t === 'lobby') { if (!room || room.state !== m.state) me = null; room = m; show(); }
      else if (m.t === 'me') { me = m; showRace(); }
      else if (m.t === 'vib') { try { navigator.vibrate && navigator.vibrate(60); } catch (e) { /* sin vibración */ } }
    };
  }
  const send = (m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));

  // ---------- Pantallas ----------
  function show() {
    const mine = room && room.players.find((p) => p.pid === pid);
    const inRace = room && room.state === 'race' && room.racers.includes(pid);
    const state = editing || !room || !mine ? 'join' : inRace ? 'race' : room.state === 'results' && room.results.some((r) => r.pid === pid) ? 'end' : 'wait';
    for (const s of ['join', 'wait', 'race', 'end']) $(s).classList.toggle('hidden', s !== state);
    if (!room || !mine) return;
    if (state === 'wait') {
      const g = $('mycar').getContext('2d');
      g.clearRect(0, 0, 440, 276);
      Cars.draw(g, mine.car, mine.color, 220, 138, 0, 5.5);
      $('wname').textContent = mine.name + ' · ' + Cars.names[mine.car];
      $('wtitle').textContent = room.state === 'lobby' ? '¡Estás adentro!' : 'Carrera en curso';
      $('wmsg').textContent = room.state === 'lobby' ? (mine.leader ? 'Cuando estén todos, dale a empezar.' : 'Esperando que el anfitrión largue la carrera…') : 'Entrás en la próxima carrera.';
      $('boss').classList.toggle('hidden', !(mine.leader && room.state === 'lobby'));
      $('change').classList.toggle('hidden', room.state !== 'lobby');
      $('track').textContent = room.tracks[room.track];
      $('laps').textContent = room.laps;
      $('races').textContent = room.races === 1 ? 'Carrera única' : 'Torneo de ' + room.races;
      $('bots').textContent = room.players.filter((p) => p.bot).length;
    } else if (state === 'end') {
      const i = room.results.findIndex((r) => r.pid === pid), r = room.results[i];
      const tour = room.tour, pending = tour && tour.done < tour.n;
      $('endtitle').textContent = !tour ? '🏆 Final' : pending ? 'Carrera ' + tour.done + ' de ' + tour.n : '🏆 Final del torneo';
      $('endpos').textContent = (i + 1) + '°';
      $('endtime').textContent = (r.time == null ? 'No llegaste a terminar' : 'Tiempo: ' + fmt(r.time)) + (tour ? ' · +' + r.pts + ' pts' : '');
      const rows = tour ? tour.table.map((x) => [x, x.pts + ' pts']) : room.results.map((x) => [x, x.time == null ? '' : fmt(x.time)]);
      $('endlabel').textContent = tour ? 'Tabla del torneo' : 'Posiciones';
      $('endlist').replaceChildren(...rows.map(([x, v], k) => {
        const d = document.createElement('div');
        d.textContent = (k + 1) + '° ' + x.name + (v ? ' — ' + v : '');
        if (x.pid === pid) d.style.color = '#ffeb3b';
        return d;
      }));
      $('next').classList.toggle('hidden', !(mine.leader && pending));
      if (pending) $('next').textContent = 'Siguiente: ' + room.tracks[tour.tracks[tour.done]];
      $('again').classList.toggle('hidden', !mine.leader);
      $('again').textContent = pending ? 'Terminar torneo' : 'Volver al lobby';
      $('again').className = pending ? 'sec' : 'big';
      $('endmsg').classList.toggle('hidden', mine.leader);
    } else if (state === 'race') {
      showRace();
    }
  }

  function showRace() {
    if (!me) { $('rmsg').textContent = '¡Preparate!'; return; }
    $('rpos').textContent = me.pos + '°/' + me.n;
    $('rlap').textContent = 'V ' + me.lap + '/' + me.laps;
    $('rmsg').textContent = me.fin ? '🏁 ¡Llegaste!' : me.cd > 3 ? '¡Preparate!' : me.cd > 0 ? String(me.cd) : me.wrong ? '⚠️ ¡AL REVÉS!' : '';
    const ready = me.pw >= 10;
    $('bpw').classList.toggle('has', ready);
    $('bpw').classList.toggle('burn', !!me.ni);
    $('pwfill').style.height = ready || me.ni ? '0' : me.pw * 10 + '%';
    $('pwname').textContent = me.ni ? '¡NITRO!' : ready ? 'NITRO' : 'cargando…';
  }

  function fmt(t) {
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  // ---------- Controles ----------
  const held = { l: new Set(), r: new Set() };
  function updateSteer() {
    const s = (held.r.size ? 1 : 0) - (held.l.size ? 1 : 0);
    $('bl').classList.toggle('on', held.l.size > 0);
    $('br').classList.toggle('on', held.r.size > 0);
    if (s !== steer) { steer = s; send({ t: 'in', s }); }
  }
  function pad(el, key) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ } held[key].add(e.pointerId); updateSteer(); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      el.addEventListener(ev, (e) => { held[key].delete(e.pointerId); updateSteer(); });
    }
  }
  pad($('bl'), 'l');
  pad($('br'), 'r');
  $('bpw').addEventListener('pointerdown', (e) => { e.preventDefault(); send({ t: 'pw' }); });
  $('race').addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => { held.l.clear(); held.r.clear(); updateSteer(); });
  // Teclado, para probar desde la compu
  window.addEventListener('keydown', (e) => {
    if (e.repeat || $('race').classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') { held.l.add('k'); updateSteer(); }
    else if (e.key === 'ArrowRight') { held.r.add('k'); updateSteer(); }
    else if (e.key === ' ' || e.key === 'ArrowUp') send({ t: 'pw' });
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') { held.l.delete('k'); updateSteer(); }
    else if (e.key === 'ArrowRight') { held.r.delete('k'); updateSteer(); }
  });

  document.querySelectorAll('[data-cfg]').forEach((b) => b.addEventListener('click', () => {
    if (!room) return;
    const k = b.dataset.cfg, d = Number(b.dataset.d);
    const cur = k === 'bots' ? room.players.filter((p) => p.bot).length : room[k];
    send({ t: 'cfg', [k]: cur + d });
  }));
  $('start').onclick = () => send({ t: 'start' });
  $('next').onclick = () => send({ t: 'start' });
  $('again').onclick = () => send({ t: 'lobby' });

  // Si ya estaba en la sala (recarga de página), vuelve a entrar solo
  if (code && sessionStorage.getItem('pid-' + code) && name) $('go').onclick();
})();
