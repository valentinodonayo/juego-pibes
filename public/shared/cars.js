// Diseños de autos dibujados con canvas. Todos miran hacia +x y ocupan
// aproximadamente 56 x 30 unidades centradas en el origen.
(function () {
  const COLORS = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#f06292', '#eceff1', '#6d4c41'];
  const T = 7;

  function sh(g, fill, fn, noStroke) {
    g.beginPath();
    fn(g);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (!noStroke) g.stroke();
  }
  const el = (g, x, y, rx, ry, f, ns) => sh(g, f, (g) => g.ellipse(x, y, rx, ry, 0, 0, T), ns);
  const rr = (g, x, y, w, h, r, f, ns) => sh(g, f, (g) => {
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }, ns);
  const poly = (g, p, f, ns) => sh(g, f, (g) => {
    g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath();
  }, ns);
  const line = (g, p, col, w) => {
    g.save(); g.beginPath(); g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); g.restore();
  };
  const eyes = (g, x, dy, r) => {
    for (const s of [-1, 1]) { el(g, x, s * dy, r, r, '#fff'); el(g, x + r * 0.35, s * dy, r * 0.45, r * 0.45, '#111', 1); }
  };
  const wheels = (g, xf, xr, y) => {
    for (const x of [xf, xr]) for (const s of [-1, 1]) rr(g, x - 6, s * y - 3.5, 12, 7, 2, '#222');
  };

  const D = [
    { name: 'Fórmula 1', draw(g, c) {
      wheels(g, 15, -17, 13);
      rr(g, 20, -12, 6, 24, 1, '#333'); rr(g, -28, -11, 6, 22, 1, '#333');
      poly(g, [-24, -7, 4, -8, 27, -3, 27, 3, 4, 8, -24, 7], c);
      el(g, -3, 0, 5, 5, '#fff'); el(g, -2, 0, 2.5, 3, '#333', 1);
    } },
    { name: 'Cohete', draw(g, c) {
      poly(g, [-26, 0, -38, -6, -32, 0, -38, 6], '#ff9800');
      poly(g, [-22, -8, -28, -15, -12, -9], '#c62828'); poly(g, [-22, 8, -28, 15, -12, 9], '#c62828');
      rr(g, -24, -9, 38, 18, 6, c);
      sh(g, '#c62828', (g) => { g.moveTo(13, -9); g.quadraticCurveTo(30, -6, 30, 0); g.quadraticCurveTo(30, 6, 13, 9); g.closePath(); });
      el(g, 2, 0, 5, 5, '#b3e5fc');
    } },
    { name: 'Rata', draw(g, c) {
      line(g, [-20, 0, -27, 5, -33, -2, -38, 3], '#f48fb1', 3);
      el(g, -4, 0, 18, 11, c);
      el(g, 10, -9, 5, 5, '#f8bbd0'); el(g, 10, 9, 5, 5, '#f8bbd0');
      sh(g, c, (g) => { g.moveTo(8, -9); g.quadraticCurveTo(22, -6, 29, 0); g.quadraticCurveTo(22, 6, 8, 9); g.closePath(); });
      el(g, 28, 0, 2.5, 2.5, '#f06292'); eyes(g, 17, 4.5, 2.2);
      line(g, [24, -1, 30, -8], '#333', 0.8); line(g, [24, 1, 30, 8], '#333', 0.8);
    } },
    { name: 'El Pitulín', draw(g, c) {
      el(g, -20, -8, 9, 8, c); el(g, -20, 8, 9, 8, c);
      rr(g, -20, -7.5, 36, 15, 7, c);
      sh(g, '#f48fb1', (g) => { g.moveTo(12, -9); g.quadraticCurveTo(30, -9, 30, 0); g.quadraticCurveTo(30, 9, 12, 9); g.quadraticCurveTo(16, 0, 12, -9); });
      line(g, [26, 0, 30, 0], '#333', 1);
    } },
    { name: 'Banana', draw(g) {
      sh(g, '#fdd835', (g) => { g.moveTo(-27, 6); g.quadraticCurveTo(0, -22, 27, 6); g.quadraticCurveTo(0, 2, -27, 6); g.closePath(); });
      sh(g, '#fdd835', (g) => { g.moveTo(-27, 6); g.quadraticCurveTo(0, -8, 27, 6); g.quadraticCurveTo(0, 14, -27, 6); g.closePath(); });
      el(g, -27, 6, 2.5, 2.5, '#5d4037'); el(g, 27, 6, 2.5, 2.5, '#5d4037');
    } },
    { name: 'Patito', draw(g, c) {
      poly(g, [-18, -6, -29, 0, -18, 6], '#fbc02d');
      el(g, -6, 0, 17, 13, '#fdd835');
      el(g, -8, 0, 8, 6, '#fbc02d', 1);
      el(g, 12, 0, 9, 9, '#fdd835');
      poly(g, [19, -4, 29, 0, 19, 4], '#fb8c00'); eyes(g, 14, 5, 2);
      rr(g, -4, -3, 6, 6, 1, c);
    } },
    { name: 'Inodoro', draw(g, c) {
      rr(g, -27, -13, 14, 26, 3, '#fff');
      rr(g, -24, -3, 4, 6, 1, '#b0bec5');
      el(g, 6, 0, 21, 13, '#fff'); el(g, 6, 0, 15, 8.5, c);
      el(g, 7, 0, 10, 5, '#4fc3f7');
    } },
    { name: 'Choripán', draw(g) {
      rr(g, -26, -12, 52, 24, 12, '#e0b070');
      rr(g, -29, -5.5, 58, 11, 5.5, '#b23a2a');
      for (const [x, y] of [[-15, -8], [-3, 8], [9, -8], [17, 8], [-20, 8]]) el(g, x, y, 1.6, 1.6, '#2e7d32', 1);
      line(g, [-20, 0, -10, -2, 0, 1, 10, -1, 20, 1], '#fdd835', 1.5);
    } },
    { name: 'Ojota', draw(g, c) {
      sh(g, c, (g) => { g.moveTo(-27, 0); g.bezierCurveTo(-27, -12, -8, -9, 4, -12); g.bezierCurveTo(22, -15, 29, -8, 29, 0); g.bezierCurveTo(29, 8, 22, 15, 4, 12); g.bezierCurveTo(-8, 9, -27, 12, -27, 0); });
      line(g, [-6, -11, 17, 0, -6, 11], '#222', 3.5);
      el(g, 17, 0, 2.5, 2.5, '#222', 1);
    } },
    { name: 'Tiburón', draw(g) {
      poly(g, [-18, 0, -30, -11, -24, 0, -30, 11], '#78909c');
      poly(g, [-2, -8, -12, -17, 6, -9], '#78909c'); poly(g, [-2, 8, -12, 17, 6, 9], '#78909c');
      sh(g, '#90a4ae', (g) => { g.moveTo(-22, 0); g.quadraticCurveTo(-5, -14, 18, -8); g.quadraticCurveTo(30, -3, 30, 0); g.quadraticCurveTo(30, 3, 18, 8); g.quadraticCurveTo(-5, 14, -22, 0); });
      poly(g, [-10, 0, 2, -2.5, 6, 0, 2, 2.5], '#546e7a');
      eyes(g, 19, 5.5, 1.8);
      poly(g, [24, -3, 29, -1.5, 25, 0, 29, 1.5, 24, 3], '#fff');
    } },
    { name: 'OVNI', draw(g, c) {
      el(g, 0, 0, 22, 15, '#b0bec5');
      for (let i = 0; i < 8; i++) { const a = (i / 8) * T; el(g, Math.cos(a) * 17, Math.sin(a) * 11, 2, 2, i % 2 ? '#ffeb3b' : '#f44336', 1); }
      el(g, 0, 0, 10, 8, c);
      el(g, 2, 0, 5, 4, '#8bc34a'); eyes(g, 4, 2, 1.3);
    } },
    { name: 'Mate', draw(g, c) {
      line(g, [2, -2, 28, -9], '#cfd8dc', 3.5);
      el(g, -4, 0, 15, 15, c);
      el(g, -4, 0, 11, 11, '#cfd8dc');
      el(g, -4, 0, 9, 9, '#558b2f');
      for (const [x, y] of [[-8, -3], [-2, 4], [-6, 3], [0, -3]]) el(g, x, y, 1.2, 1.2, '#9ccc65', 1);
    } },
    { name: 'Pizza', draw(g) {
      poly(g, [-24, -15, 28, 0, -24, 15], '#ffca28');
      rr(g, -28, -15, 7, 30, 3, '#c98a3c');
      for (const [x, y] of [[-12, -6], [-10, 6], [2, 0], [12, -1]]) el(g, x, y, 3.2, 3.2, '#c62828');
      for (const [x, y] of [[-4, -6], [-2, 7], [8, 4]]) el(g, x, y, 1.3, 1.3, '#2e7d32', 1);
    } },
    { name: 'Caca', draw(g) {
      el(g, -14, 0, 14, 14, '#795548'); el(g, 0, 0, 12, 12, '#795548'); el(g, 13, 0, 9, 9, '#795548');
      el(g, 23, 0, 5, 5, '#795548');
      eyes(g, 4, 5, 3);
      line(g, [-8, -5, -4, 0, -8, 5], '#4e342e', 1.5);
    } },
    { name: 'Colectivo', draw(g, c) {
      wheels(g, 16, -16, 13);
      rr(g, -28, -12, 56, 24, 4, c);
      rr(g, 19, -10, 6, 20, 2, '#b3e5fc');
      for (let x = -24; x < 14; x += 9) { rr(g, x, -10.5, 6, 4, 1, '#b3e5fc'); rr(g, x, 6.5, 6, 4, 1, '#b3e5fc'); }
      rr(g, -22, -3, 34, 6, 2, '#fff');
    } },
    { name: 'Tanque', draw(g, c) {
      rr(g, -26, -15, 50, 7, 2, '#333'); rr(g, -26, 8, 50, 7, 2, '#333');
      rr(g, -23, -10, 44, 20, 3, '#558b2f');
      rr(g, 2, -2.5, 28, 5, 1, '#33691e');
      el(g, -3, 0, 9, 9, c);
    } },
    { name: 'Changuito', draw(g, c) {
      wheels(g, 14, -14, 12);
      line(g, [-28, -11, -28, 11], c, 4);
      line(g, [-28, -8, -20, -8], '#555', 2); line(g, [-28, 8, -20, 8], '#555', 2);
      poly(g, [-20, -12, 24, -9, 24, 9, -20, 12], '#cfd8dc');
      for (let x = -12; x < 22; x += 8) line(g, [x, -11, x, 11], '#78909c', 1);
      for (const y of [-5, 0, 5]) line(g, [-20, y, 24, y], '#78909c', 1);
      el(g, 4, 0, 5, 5, '#ef5350'); el(g, -8, -3, 4, 4, '#ffca28');
    } },
    { name: 'Empanada', draw(g) {
      sh(g, '#e6b566', (g) => { g.moveTo(-27, 11); g.bezierCurveTo(-27, -22, 27, -22, 27, 11); g.closePath(); });
      for (let x = -22; x <= 22; x += 6.3) line(g, [x, 10.5, x + 2.5, 6], '#b07a2e', 1.6);
      line(g, [-12, -4, -6, -8], '#b07a2e', 1.4); line(g, [4, -8, 10, -5], '#b07a2e', 1.4);
    } },
    { name: 'Cucaracha', draw(g, c) {
      for (const x of [-10, 0, 10]) { line(g, [x, -8, x - 5, -16], '#3e2723', 1.5); line(g, [x, 8, x - 5, 16], '#3e2723', 1.5); }
      line(g, [20, -2, 31, -9], '#3e2723', 1); line(g, [20, 2, 31, 9], '#3e2723', 1);
      el(g, -3, 0, 20, 10, '#6d4c41');
      line(g, [-21, 0, 10, 0], '#3e2723', 1.2);
      el(g, 18, 0, 6, 6, '#4e342e'); eyes(g, 20, 3, 1.3);
      el(g, -6, 0, 4, 3, c, 1);
    } },
    { name: 'Huevo frito', draw(g) {
      sh(g, '#fff', (g) => { g.moveTo(-26, 0); g.bezierCurveTo(-28, -14, -10, -10, -4, -15); g.bezierCurveTo(8, -18, 14, -9, 24, -8); g.bezierCurveTo(31, 0, 22, 8, 14, 12); g.bezierCurveTo(4, 17, -6, 10, -14, 14); g.bezierCurveTo(-26, 14, -24, 6, -26, 0); });
      el(g, 3, 0, 9, 9, '#ffb300'); el(g, 6, -3, 2.5, 2, '#ffe082', 1);
    } },
    { name: 'Tortuga', draw(g, c) {
      for (const [x, y] of [[-12, -12], [-12, 12], [10, -12], [10, 12]]) el(g, x, y, 6, 4.5, '#8bc34a');
      poly(g, [-18, -3, -27, 0, -18, 3], '#8bc34a');
      el(g, 22, 0, 7, 6, '#8bc34a'); eyes(g, 24, 3, 1.4);
      el(g, 0, 0, 19, 14, c);
      poly(g, [-6, -6, 6, -6, 10, 0, 6, 6, -6, 6, -10, 0], null);
      line(g, [-10, 0, -19, 0], '#222', 1); line(g, [10, 0, 19, 0], '#222', 1);
      line(g, [-6, -6, -10, -12], '#222', 1); line(g, [6, -6, 10, -12], '#222', 1);
      line(g, [-6, 6, -10, 12], '#222', 1); line(g, [6, 6, 10, 12], '#222', 1);
    } },
    { name: 'Dona', draw(g, c) {
      sh(g, '#d7a15f', (g) => { g.arc(0, 0, 15, 0, T); g.moveTo(5, 0); g.arc(0, 0, 5, 0, T, true); }, 1);
      g.save(); g.beginPath(); g.arc(0, 0, 13, 0, T); g.arc(0, 0, 6.5, 0, T, true); g.fillStyle = c; g.fill('evenodd'); g.restore();
      el(g, 0, 0, 15, 15, null); el(g, 0, 0, 5, 5, null);
      const cols = ['#fff', '#ffeb3b', '#4fc3f7', '#aed581'];
      for (let i = 0; i < 10; i++) { const a = i * 0.63, r = 9.5 + (i % 2); line(g, [Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * r + 2, Math.sin(a) * r + 1], cols[i % 4], 1.4); }
    } },
    { name: 'Fantasma', draw(g) {
      sh(g, '#fafafa', (g) => { g.moveTo(-26, -12); g.lineTo(12, -12); g.bezierCurveTo(32, -12, 32, 12, 12, 12); g.lineTo(-26, 12); g.lineTo(-19, 6); g.lineTo(-26, 0); g.lineTo(-19, -6); g.closePath(); });
      el(g, 14, -5, 3, 3.5, '#111', 1); el(g, 14, 5, 3, 3.5, '#111', 1);
      el(g, 22, 0, 2, 4, '#111', 1);
    } },
    { name: 'Zapatilla', draw(g, c) {
      sh(g, '#fff', (g) => { g.moveTo(-28, 0); g.bezierCurveTo(-28, -13, -6, -11, 6, -13); g.bezierCurveTo(24, -14, 29, -7, 29, 0); g.bezierCurveTo(29, 7, 24, 14, 6, 13); g.bezierCurveTo(-6, 11, -28, 13, -28, 0); });
      sh(g, c, (g) => { g.moveTo(-25, 0); g.bezierCurveTo(-25, -10, -6, -8, 5, -10); g.bezierCurveTo(14, -10, 18, -6, 18, 0); g.bezierCurveTo(18, 6, 14, 10, 5, 10); g.bezierCurveTo(-6, 8, -25, 10, -25, 0); });
      el(g, -14, 0, 8, 5.5, '#333');
      for (const x of [-2, 4, 10]) line(g, [x, -5, x, 5], '#fff', 1.8);
    } },
    { name: 'Lápiz', draw(g, c) {
      rr(g, -29, -7, 8, 14, 3, '#f48fb1');
      rr(g, -22, -7, 4, 14, 0, '#b0bec5');
      rr(g, -18, -7, 34, 14, 0, c);
      line(g, [-18, -2.3, 16, -2.3], 'rgba(0,0,0,.25)', 1); line(g, [-18, 2.3, 16, 2.3], 'rgba(0,0,0,.25)', 1);
      poly(g, [16, -7, 29, 0, 16, 7], '#e6c9a0');
      poly(g, [24, -2.7, 29, 0, 24, 2.7], '#333');
    } },
    { name: 'Carpincho', draw(g) {
      for (const [x, y] of [[-14, -11], [-14, 11], [6, -11], [6, 11]]) el(g, x, y, 5, 3.5, '#6d4c41');
      el(g, -5, 0, 20, 12, '#a1764a');
      rr(g, 8, -8, 20, 16, 6, '#a1764a');
      el(g, 10, -8, 3, 2.5, '#6d4c41'); el(g, 10, 8, 3, 2.5, '#6d4c41');
      eyes(g, 17, 5, 1.5);
      el(g, 26, -2, 1, 1, '#3e2723', 1); el(g, 26, 2, 1, 1, '#3e2723', 1);
    } },
  ];

  function draw(g, design, color, x, y, angle, scale) {
    const d = D[design] || D[0];
    g.save();
    g.translate(x, y);
    g.rotate(angle || 0);
    g.scale(scale || 1, scale || 1);
    g.lineWidth = 1.6;
    g.strokeStyle = '#222';
    g.lineJoin = 'round';
    d.draw(g, COLORS[color] || COLORS[0]);
    g.restore();
  }

  self.Cars = { COLORS, names: D.map((d) => d.name), count: D.length, draw };
})();
