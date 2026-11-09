/* ============================================================
   render — Canvas 2D + ブルーム（ダウンサンプル合成）＋シンセウェイヴ背景
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});
  var CFG = N.CFG, U = N.util;

  var cv = null, ctx = null;
  var W = 0, H = 0, dpr = 1;
  var qual = 'high';                 // 'high' | 'low'
  var fxMode = 'full';               // 'full' | 'soft' | 'off'
  var stars = [], bgCache = null, bgKey = '';
  var bloom = [null, null, null], bloomCtx = [null, null, null];
  var tGlobal = 0;

  var PTC = {
    speed: '#ffd93b', ghost: '#4dff9f', grow: '#2af2ff', shrink: '#ff43d6',
    magnet: '#a066ff', double: '#ff8c36', time: '#4dff9f'
  };

  function setup() {
    cv = document.getElementById('stage');
    ctx = cv.getContext('2d', { alpha: false });
    for (var i = 0; i < 3; i++) {
      bloom[i] = document.createElement('canvas');
      bloomCtx[i] = bloom[i].getContext('2d');
    }
  }

  function setQuality(q) { qual = q; resize(); }
  function getQuality() { return qual; }
  function setFx(mode) {
    fxMode = mode;
    document.body.classList.toggle('fx-crt', mode === 'full');
  }

  function resize() {
    var cap = qual === 'high' ? 2 : 1;
    dpr = Math.min(window.devicePixelRatio || 1, cap);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var i = 0; i < 3; i++) {
      var f = (i + 1) * 2;
      bloom[i].width = Math.max(1, Math.floor(W / f));
      bloom[i].height = Math.max(1, Math.floor(H / f));
    }
    bgKey = '';
    if (window.NSO_G) { window.NSO_G.W = W; window.NSO_G.H = H; }
  }

  function makeStars() {
    var key = W + 'x' + H + 'x' + qual;
    if (bgKey === key) return;
    bgKey = key;
    stars = [];
    var n = qual === 'high' ? 90 : 40;
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.62, r: U.rnd(0.4, 1.6), p: Math.random() * 6.28, s: U.rnd(0.6, 2.2) });
    }
  }

  /* ---------- background ---------- */
  function drawBackground(G) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#080a18');
    g.addColorStop(0.55, '#06060f');
    g.addColorStop(1, '#0d0718');
    ctx.fillStyle = g;
    ctx.fillRect(-40, -40, W + 80, H + 80);

    /* オーバードライブ時の色被せ */
    if (G.od > 0) {
      ctx.globalAlpha = 0.16 * G.od;
      var g2 = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
      g2.addColorStop(0, '#ff43d6'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    makeStars();
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = 0.14 + 0.24 * (0.5 + 0.5 * Math.sin(tGlobal * s.s + s.p));
      ctx.globalAlpha = a;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    if (qual === 'high') drawSun(G);
    drawGrid(G);
  }

  function drawSun(G) {
    var cx = W / 2, cy = H * 0.34, r = Math.min(W, H) * 0.19;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    var g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    var mix = 0.5 + 0.5 * Math.sin(tGlobal * 0.25);
    g.addColorStop(0, U.hex2rgba('#ffd93b', 0.30 + 0.1 * mix));
    g.addColorStop(0.5, U.hex2rgba('#ff43d6', 0.22));
    g.addColorStop(1, U.hex2rgba('#2af2ff', 0.16));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    /* スリット */
    ctx.fillStyle = 'rgba(6,6,15,0.92)';
    for (var y = cy - r * 0.1; y < cy + r; y += 9) {
      var h = 1.2 + (y - (cy - r)) / r * 4;
      ctx.fillRect(cx - r, y, r * 2, h);
    }
    ctx.restore();
  }

  function drawGrid(G) {
    var hz = H * 0.34;
    var spd = 0.35 + (G.od || 0) * 0.5;
    var phase = (tGlobal * spd) % 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = U.hex2rgba('#2af2ff', 0.11 + 0.07 * (G.od || 0));
    /* 水平線（遠近） */
    for (var i = 0; i < 16; i++) {
      var f = (i + phase) / 16;
      var y = hz + Math.pow(f, 2.4) * (H - hz) * 1.25;
      if (y > H) continue;
      ctx.globalAlpha = 0.25 + f * 0.75;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    /* 収束する縦線 */
    var vx = W / 2;
    ctx.globalAlpha = 0.35;
    for (var k = -14; k <= 14; k++) {
      var bx = vx + k * (W / 12);
      ctx.beginPath(); ctx.moveTo(vx + k * 10, hz); ctx.lineTo(bx, H); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawArena() {
    var w = CFG.WALL;
    ctx.lineWidth = 3;
    ctx.strokeStyle = U.hex2rgba('#2af2ff', 0.5 + 0.22 * Math.sin(tGlobal * 1.6));
    ctx.strokeRect(w, w, W - w * 2, H - w * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,67,214,0.16)';
    ctx.strokeRect(w - 6, w - 6, W - (w - 6) * 2, H - (w - 6) * 2);
  }

  /* ---------- entities ---------- */
  function drawOrbs(G) {
    for (var i = 0; i < G.orbs.length; i++) {
      var o = G.orbs[i];
      var r = (o.r || CFG.ORB_R) + Math.sin(o.pulse) * 2.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = o.kind === 'gold' ? 0.30 : 0.20;
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.arc(o.x, o.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.92;
      ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
      if (o.kind === 'gold') {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#fff8c8'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(o.x, o.y, r + 5 + Math.sin(o.pulse * 1.4) * 2, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawPowers(G) {
    for (var i = 0; i < G.powers.length; i++) {
      var p = G.powers[i];
      var s = 13 + Math.sin(p.pulse) * 2.5;
      var c = PTC[p.type] || '#ffffff';
      var fade = p.life < 3 ? (0.35 + 0.65 * Math.abs(Math.sin(p.life * 6))) : 1;
      ctx.globalAlpha = fade;
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s, p.y);
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = U.hex2rgba(c, 0.22); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 12px ' + 'Chakra Petch, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ speed: '⚡', ghost: '👻', grow: '📈', shrink: '✂', magnet: '🧲', double: '✦', time: '⏳' }[p.type] || '◆', p.x, p.y + 1);
      ctx.globalAlpha = 1;
    }
  }

  function drawPulses(G) {
    for (var i = 0; i < G.pulseWaves.length; i++) {
      var pw = G.pulseWaves[i];
      var a = Math.max(0, 1 - pw.r / pw.maxR);
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = pw.color; ctx.lineWidth = 2 + a * 3;
      ctx.beginPath(); ctx.arc(pw.x, pw.y, pw.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = a * 0.16;
      ctx.beginPath(); ctx.arc(pw.x, pw.y, Math.max(0, pw.r - 22), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function snakePoints(s) {
    var pts = [];
    for (var i = 0; i < s.segments.length; i++) pts.push(s.segments[i]);
    pts.push({ x: s.x, y: s.y });
    return pts;
  }

  function drawSnake(s, G) {
    if (!s.alive) return;
    var pts = snakePoints(s);
    var n = pts.length;
    var ghost = s.ghost > 0, stunned = s.stun > 0;
    var base = 8 + Math.min(10, s.length * 0.12);

    ctx.globalAlpha = ghost ? 0.42 : 1;

    /* 胴体：区間ごとに太さを変えるストロークで“つながった”体にする */
    var body = stunned ? '#7d8794' : s.color;
    var w = [], i, t;
    for (i = 0; i < n; i++) { t = i / (n - 1 || 1); w.push(base * (0.44 + 0.56 * t)); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    /* 1) 縁取り（背景との分離） */
    ctx.strokeStyle = 'rgba(4,6,16,0.9)';
    ctx.globalAlpha = ghost ? 0.5 : 1;
    for (i = 1; i < n; i++) {
      ctx.lineWidth = (w[i] + 2.6) * 2;
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
    /* 2) 胴体（尾→頭で濃くなるグラデ） */
    ctx.strokeStyle = body;
    for (i = 1; i < n; i++) {
      t = i / (n - 1 || 1);
      ctx.globalAlpha = (ghost ? 0.42 : 1) * (0.74 + 0.26 * t);
      ctx.lineWidth = w[i] * 2;
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
    /* 3) 発光コア */
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = s.isPlayer ? '#ffffff' : 'rgba(255,255,255,0.85)';
    var st2 = n > 32 ? 2 : 1;
    for (i = st2; i < n; i += st2) {
      t = i / (n - 1 || 1);
      ctx.globalAlpha = (ghost ? 0.26 : 0.5) * (0.4 + 0.6 * t);
      ctx.lineWidth = w[i] * 0.62;
      ctx.beginPath();
      ctx.moveTo(pts[Math.max(0, i - st2)].x, pts[Math.max(0, i - st2)].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    /* 尾の先：向きが読めるニードル */
    var tail = pts[0];
    ctx.fillStyle = U.hex2rgba(s.color, 0.55);
    ctx.beginPath();
    ctx.arc(tail.x, tail.y, base * 0.42 + 1.5, 0, Math.PI * 2); ctx.fill();

    /* 突進予告 */
    if (s.telegraph > 0.02 && !s.isPlayer) {
      ctx.globalAlpha = Math.min(0.6, s.telegraph * 0.6);
      ctx.strokeStyle = '#ff5470'; ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(s.angle) * 190, s.y + Math.sin(s.angle) * 190);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    /* 頭 */
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = ghost ? 0.7 : 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, base * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    /* 瞳 */
    ctx.fillStyle = '#0a0a12';
    var er = Math.max(1.8, base * 0.2);
    ctx.beginPath(); ctx.arc(s.x + Math.cos(s.angle - 0.45) * base * 0.42, s.y + Math.sin(s.angle - 0.45) * base * 0.42, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + Math.cos(s.angle + 0.45) * base * 0.42, s.y + Math.sin(s.angle + 0.45) * base * 0.42, er, 0, Math.PI * 2); ctx.fill();
    if (s.flash > 0) {
      ctx.globalAlpha = Math.min(1, s.flash * 3);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, base + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    /* 無敵リング（元作踏襲） */
    if (ghost) {
      ctx.strokeStyle = 'rgba(77,255,159,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, base + 9 + Math.sin(tGlobal * 8) * 3, 0, Math.PI * 2); ctx.stroke();
    }
    /* スタン演出 */
    if (stunned) {
      ctx.strokeStyle = '#ffd93b'; ctx.lineWidth = 1.5;
      for (var z = 0; z < 3; z++) {
        var a0 = tGlobal * 6 + z * 2.1;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(tGlobal * 14 + z);
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a0) * (base + 4), s.y + Math.sin(a0) * (base + 4));
        ctx.lineTo(s.x + Math.cos(a0 + 0.6) * (base + 13), s.y + Math.sin(a0 + 0.6) * (base + 13));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(255,217,59,0.5)';
      ctx.beginPath(); ctx.arc(s.x, s.y, base + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawPlayerAid(G) {
    var p = G.player;
    if (!p || !p.alive || G.state !== 'playing') return;
    /* AIM DEADZONE の可視化（元作の仕様を親切にする） */
    ctx.strokeStyle = 'rgba(42,242,255,0.18)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.arc(p.x, p.y, CFG.AIM_DEADZONE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    /* 狙い線 */
    ctx.strokeStyle = 'rgba(42,242,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.targetAngle) * 14, p.y + Math.sin(p.targetAngle) * 14);
    ctx.lineTo(p.x + Math.cos(p.targetAngle) * 44, p.y + Math.sin(p.targetAngle) * 44);
    ctx.stroke();
    /* パルクールダウンリング（元作踏襲） */
    var pct = Math.max(0, p.pulseCd / CFG.PULSE_CD);
    var rr = 15;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - pct));
    ctx.strokeStyle = pct > 0 ? 'rgba(255,255,255,0.25)' : '#4dff9f';
    ctx.stroke();
  }

  function drawParticles(G) {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < G.parts.length; i++) {
      var p = G.parts[i];
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      var s = p.size * (0.35 + 0.65 * p.life);
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawFloaters(G) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < G.floaters.length; i++) {
      var f = G.floaters[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.font = '700 ' + f.size + 'px Orbitron, Chakra Petch, sans-serif';
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- bloom ---------- */
  function bloomPass(G) {
    if (fxMode === 'off' || qual === 'low') return;
    var cw = cv.width, ch = cv.height;
    var b0 = bloom[0], c0 = bloomCtx[0];
    c0.globalCompositeOperation = 'source-over';
    c0.clearRect(0, 0, b0.width, b0.height);
    c0.drawImage(cv, 0, 0, b0.width, b0.height);
    for (var i = 1; i < 3; i++) {
      var b = bloom[i], c = bloomCtx[i], prev = bloom[i - 1];
      c.clearRect(0, 0, b.width, b.height);
      c.drawImage(prev, 0, 0, b.width, b.height);
    }
    ctx.globalCompositeOperation = 'lighter';
    var am = fxMode === 'full' ? [0.44, 0.36, 0.30] : [0.22, 0.18, 0.13];
    var boost = 1 + (G.od || 0) * 0.5;
    for (var k = 0; k < 3; k++) {
      ctx.globalAlpha = Math.min(0.75, am[k] * boost);
      ctx.drawImage(bloom[k], 0, 0, W, H);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- frame ---------- */
  function frame(G, dt) {
    tGlobal += dt;
    var sh = G.shake;
    ctx.save();
    if (sh > 0.4) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    drawBackground(G);
    drawArena();
    drawPulses(G);
    drawOrbs(G);
    drawPowers(G);
    for (var i = 0; i < G.ai.length; i++) drawSnake(G.ai[i], G);
    if (G.player) drawSnake(G.player, G);
    drawPlayerAid(G);
    drawParticles(G);
    drawFloaters(G);

    if (G.flash > 0.01) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, G.flash) + ')';
      ctx.fillRect(-40, -40, W + 80, H + 80);
    }
    ctx.restore();

    if (sh > 0.4) {
      /* 揺らした結果で端に出た黒を埋める */
      ctx.fillStyle = '#06060f';
      var m = Math.ceil(sh);
      ctx.fillRect(0, 0, m, H); ctx.fillRect(W - m, 0, m, H);
      ctx.fillRect(0, 0, W, m); ctx.fillRect(0, H - m, W, m);
    }

    bloomPass(G);
  }

  N.render = {
    setup: setup, resize: resize, setQuality: setQuality, getQuality: getQuality,
    setFx: setFx, frame: frame,
    size: function () { return { W: W, H: H, dpr: dpr }; }
  };
})();
