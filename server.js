const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const Tracks = require('./public/shared/tracks.js');
const { Race } = require('./lib/game.js');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const PAGES = { '/': '/index.html', '/host': '/host.html', '/play': '/play.html' };
const MAX_PLAYERS = 12;
const BOT_NAMES = ['Bot Carlitos', 'Bot Tincho', 'Bot Pepa', 'Bot Chino', 'Bot Fideo', 'Bot Rulo', 'Bot Mecha', 'Bot Tano', 'Bot Pocho', 'Bot Lola', 'Bot Kuki', 'Bot Ñoqui'];
const COLORS = 10, CAR_DESIGNS = 26;
const MAX_RACES = 8;
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 3, 2, 1, 0]; // puntos de torneo por posición

function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ lan: lanIPs(), port: PORT }));
  }
  if (url.pathname === '/qr') {
    try {
      const svg = await QRCode.toString(String(url.searchParams.get('t') || '').slice(0, 300), { type: 'svg', margin: 1 });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      return res.end(svg);
    } catch (e) {
      res.writeHead(400);
      return res.end('bad qr');
    }
  }
  const rel = PAGES[url.pathname] || url.pathname;
  const file = path.join(PUBLIC, path.normalize(rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const rooms = new Map();
const trackCache = Tracks.DEFS.map((_, i) => Tracks.build(i));

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (rooms.has(c));
  return c;
}

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
}

function broadcast(room, msg) {
  const s = JSON.stringify(msg);
  send(room.host, s);
  for (const p of room.players.values()) send(p.ws, s);
}

function ensureLeader(room) {
  const humans = [...room.players.values()].filter((p) => !p.bot);
  if (!humans.some((p) => p.leader && p.ws) && humans.length) {
    humans.forEach((p) => (p.leader = false));
    (humans.find((p) => p.ws) || humans[0]).leader = true;
  }
}

function lobbyMsg(room) {
  return {
    t: 'lobby', code: room.code, state: room.state, track: room.track, laps: room.laps, races: room.races, tracks: Tracks.names,
    tour: room.tour ? { done: room.tour.done, n: room.tour.n, tracks: room.tour.tracks, table: Object.values(room.tour.table).sort((a, b) => b.pts - a.pts) } : null,
    players: [...room.players.values()].map((p) => ({ pid: p.pid, name: p.name, car: p.car, color: p.color, leader: !!p.leader, bot: !!p.bot, on: !!p.ws || !!p.bot })),
    racers: room.racers || [],
    results: room.results || null,
  };
}

function sendLobby(room) {
  ensureLeader(room);
  broadcast(room, lobbyMsg(room));
}

function clean(s, max) {
  return (typeof s === 'string' ? s : '').replace(/[<>&"']/g, '').trim().slice(0, max);
}

function setBots(room, n) {
  const bots = [...room.players.values()].filter((p) => p.bot);
  const humans = room.players.size - bots.length;
  n = Math.max(0, Math.min(n, MAX_PLAYERS - humans));
  while (bots.length > n) room.players.delete(bots.pop().pid);
  for (let i = bots.length; i < n; i++) {
    const pid = 'bot' + (room.nextId++);
    room.players.set(pid, { pid, bot: true, name: BOT_NAMES[i % BOT_NAMES.length], car: Math.floor(Math.random() * CAR_DESIGNS), color: Math.floor(Math.random() * COLORS) });
  }
}

function startRace(room) {
  if (room.state === 'race') return;
  const entries = [...room.players.values()].filter((p) => p.bot || p.ws);
  if (!entries.length) return;
  if (room.tour && room.tour.done >= room.tour.n) room.tour = null;
  if (!room.tour && room.races > 1) {
    // Torneo: arranca en la pista elegida y sigue por las demás en orden aleatorio
    const rest = Tracks.DEFS.map((_, i) => i).filter((i) => i !== room.track);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const order = [room.track, ...rest];
    room.tour = { n: room.races, done: 0, tracks: Array.from({ length: room.races }, (_, i) => order[i % order.length]), table: {} };
  }
  if (room.tour) room.track = room.tour.tracks[room.tour.done];
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  room.race = new Race(trackCache[room.track], room.laps, entries);
  room.racers = entries.map((p) => p.pid);
  room.state = 'race';
  room.results = null;
  room.tick = 0;
  room.lastMe = {};
  sendLobby(room);
}

function endRace(room) {
  const race = room.race;
  room.results = race.ranking().map((i, pos) => {
    const c = race.cars[i], p = room.players.get(c.pid) || {};
    const r = { pid: c.pid, name: p.name || '?', car: p.car || 0, color: p.color || 0, time: c.time };
    if (room.tour) {
      r.pts = POINTS[pos] || 0;
      const row = room.tour.table[c.pid] || (room.tour.table[c.pid] = { pid: c.pid, pts: 0 });
      Object.assign(row, { name: r.name, car: r.car, color: r.color, pts: row.pts + r.pts });
    }
    return r;
  });
  if (room.tour) room.tour.done++;
  room.race = null;
  room.state = 'results';
  sendLobby(room);
}

function configure(room, m) {
  if (room.state === 'race') return;
  if (Number.isInteger(m.races) && !room.tour) room.races = Math.max(1, Math.min(MAX_RACES, m.races));
  if (Number.isInteger(m.track) && !room.tour) room.track = ((m.track % Tracks.DEFS.length) + Tracks.DEFS.length) % Tracks.DEFS.length;
  if (Number.isInteger(m.laps)) room.laps = Math.max(1, Math.min(10, m.laps));
  if (Number.isInteger(m.bots)) setBots(room, m.bots);
  sendLobby(room);
}

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const room = ws.room;

    if (m.t === 'host') {
      let r = rooms.get(String(m.code || '').toUpperCase());
      if (!r || m.key !== r.hostKey) {
        r = { code: newCode(), hostKey: crypto.randomBytes(16).toString('hex'), players: new Map(), track: 0, laps: 3, races: 1, tour: null, state: 'lobby', nextId: 1, race: null, host: null };
        rooms.set(r.code, r);
      }
      r.host = ws;
      r.hostGone = null;
      ws.room = r;
      ws.role = 'host';
      send(ws, { t: 'hostkey', key: r.hostKey });
      return sendLobby(r);
    }

    if (m.t === 'join') {
      const r = rooms.get(String(m.code || '').toUpperCase());
      if (!r) return send(ws, { t: 'err', msg: 'No existe esa sala' });
      let p = m.pid && r.players.get(m.pid);
      const old = ws.room && ws.role === 'player' && ws.room.players.get(ws.pid);
      if (old && old.ws === ws && old !== p) { old.ws = null; old.gone = Date.now(); }
      if (p && (p.bot || m.key !== p.key)) p = null;
      if (!p) {
        const humans = [...r.players.values()].filter((x) => !x.bot);
        if (humans.length >= MAX_PLAYERS) return send(ws, { t: 'err', msg: 'La sala está llena' });
        if (r.players.size >= MAX_PLAYERS && r.state === 'race') return send(ws, { t: 'err', msg: 'Sala llena, esperá a que termine la carrera' });
        if (r.players.size >= MAX_PLAYERS) setBots(r, MAX_PLAYERS - humans.length - 1);
        const pid = 'p' + (r.nextId++) + Math.random().toString(36).slice(2, 8);
        p = { pid, key: crypto.randomBytes(16).toString('hex'), name: 'Pibe', car: 0, color: 0 };
        r.players.set(pid, p);
      } else if (p.ws && p.ws !== ws) {
        p.ws.room = null;
        p.ws.close();
      }
      p.ws = ws;
      p.gone = null;
      p.name = clean(m.name, 12) || p.name;
      if (Number.isInteger(m.car)) p.car = Math.max(0, Math.min(CAR_DESIGNS - 1, m.car));
      if (Number.isInteger(m.color)) p.color = Math.max(0, Math.min(COLORS - 1, m.color));
      ws.room = r;
      ws.role = 'player';
      ws.pid = p.pid;
      send(ws, { t: 'joined', pid: p.pid, key: p.key, code: r.code });
      if (r.race) r.race.setAuto(p.pid, false);
      if (r.lastMe) delete r.lastMe[p.pid];
      return sendLobby(r);
    }

    if (!room) return;
    const player = ws.role === 'player' ? room.players.get(ws.pid) : null;
    const boss = ws.role === 'host' || (player && player.leader);

    if (m.t === 'in' && player && room.race) room.race.setSteer(player.pid, Number(m.s) || 0);
    else if (m.t === 'pw' && player && room.race) room.race.usePower(player.pid);
    else if (m.t === 'cfg' && boss) configure(room, m);
    else if (m.t === 'start' && boss) startRace(room);
    else if (m.t === 'lobby' && boss && room.state === 'results') { room.state = 'lobby'; room.tour = null; sendLobby(room); }
    else if (m.t === 'stop' && ws.role === 'host' && room.race) endRace(room);
  });

  ws.on('close', () => {
    const room = ws.room;
    if (!room) return;
    if (ws.role === 'host' && room.host === ws) {
      room.host = null;
      room.hostGone = Date.now();
    } else if (ws.role === 'player') {
      const p = room.players.get(ws.pid);
      if (p && p.ws === ws) {
        p.ws = null;
        p.gone = Date.now();
        if (room.race) room.race.setAuto(p.pid, true);
        sendLobby(room);
      }
    }
  });
});

// Bucle del juego: física a 60 Hz, estado a la pantalla a 30 Hz, estado a los celulares a 10 Hz
const DT = 1 / 60;
let last = Date.now(), acc = 0;
setInterval(() => {
  const now = Date.now();
  acc = Math.min(acc + (now - last) / 1000, 0.25);
  last = now;
  while (acc >= DT) {
    acc -= DT;
    for (const room of rooms.values()) {
      const race = room.race;
      if (!race) continue;
      race.step(DT);
      room.tick++;
      const evs = race.events.splice(0);
      room.pendingEv = (room.pendingEv || []).concat(evs.filter((e) => e.x !== undefined).map((e) => ({ k: e.k, x: e.x, y: e.y })));
      for (const e of evs) {
        if (e.pid && e.k === 'hit') { const p = room.players.get(e.pid); if (p) send(p.ws, { t: 'vib' }); }
      }
      if (room.tick % 2 === 0) {
        send(room.host, race.snapshot(room.pendingEv));
        room.pendingEv = [];
      }
      if (room.tick % 6 === 0) {
        const rank = race.ranking();
        rank.forEach((ci, pos) => {
          const c = race.cars[ci], p = room.players.get(c.pid);
          if (!p || !p.ws) return;
          const s = JSON.stringify({ t: 'me', pos: pos + 1, n: race.cars.length, lap: race.lapOf(c), laps: race.laps, pw: Math.floor(c.charge * 10), ni: c.nitro > 0, fin: c.finished, time: c.time, wrong: c.wrong > 1, cd: race.t < 0 ? Math.ceil(-race.t) : 0 });
          if (room.lastMe[c.pid] !== s) { room.lastMe[c.pid] = s; send(p.ws, s); }
        });
      }
      if (race.over) endRace(room);
    }
  }
}, 1000 / 60);

// Limpieza: conexiones caídas, jugadores que se fueron del lobby y salas sin pantalla
setInterval(() => {
  const now = Date.now();
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
  for (const room of rooms.values()) {
    let changed = false;
    for (const p of [...room.players.values()]) {
      if (!p.bot && !p.ws && p.gone && now - p.gone > (room.state === 'race' ? 120000 : 15000)) {
        if (room.state === 'race' && room.racers.includes(p.pid)) continue;
        room.players.delete(p.pid);
        changed = true;
      }
    }
    if (changed) sendLobby(room);
    if (!room.host && room.hostGone && now - room.hostGone > 120000) {
      for (const p of room.players.values()) if (p.ws) { send(p.ws, { t: 'err', msg: 'La sala se cerró' }); p.ws.room = null; }
      rooms.delete(room.code);
    }
  }
}, 10000);

server.listen(PORT, () => {
  console.log(`Juego Pibes en http://localhost:${PORT}`);
  for (const ip of lanIPs()) console.log(`  En la red local: http://${ip}:${PORT}`);
});
