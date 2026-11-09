/* ============================================================
   game — ループ / ルール / スコア / ランク / 設定 / 引継ぎ
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});
  var CFG = N.CFG, DIFF = N.DIFF, U = N.util, I18 = N.i18n;

  /* ---------------- state ---------------- */
  var G = {
    state: 'menu', W: 0, H: 0,
    orbs: [], powers: [], parts: [], floaters: [], pulseWaves: [], ai: [], player: null,
    score: 0, combo: 0, comboTimer: 0, maxCombo: 0, kills: 0, orbsEaten: 0, pulses: 0,
    time: CFG.BASE_TIME, lives: 0, diffKey: 'normal', diff: DIFF.normal,
    shake: 0, flash: 0, hitStop: 0, magnet: 0, double: 0,
    overdrive: false, od: 0, lastRank: 'D', danger: 0,
    clusterT: 5, qualityAuto: null, frameAcc: 0, frameN: 0, fps: 60
  };
  window.NSO_G = N.G = G;

  var S = U.getSettings();
  var lastTime = 0;

  /* ---------------- world ---------------- */
  function makeSnake(x, y, color, isPlayer) {
    var s = new N.Snake(x, y, color, isPlayer);
    if (!isPlayer) s.speed = G.diff.aiSpeed;
    return s;
  }

  function reviveSnake(a, ghost) {
    var p = N.safeSpawn(G, 150);
    a.x = p.x; a.y = p.y;
    a.angle = Math.random() * Math.PI * 2; a.targetAngle = a.angle;
    a.segments = [{ x: p.x, y: p.y }];
    for (var j = 1; j < 5; j++) {
      a.segments.push({ x: p.x - Math.cos(a.angle) * a.segDist * j, y: p.y - Math.sin(a.angle) * a.segDist * j });
    }
    a.targetLen = 5;
    a.alive = true; a.stun = 0; a.ghost = ghost; a.pulseCd = 0;
    a.hunt = 0; a.telegraph = 0; a.flash = 0; a.state = 'seek'; a.deadFor = 0;
    a.speed = G.diff.aiSpeed;
    a.aiTimer = 0;
  }

  function initWorld(withPlayer) {
    G.orbs = []; G.powers = []; G.parts = []; G.floaters = []; G.pulseWaves = []; G.ai = [];
    G.clusterT = U.rnd(4, 8);
    G.magnet = 0; G.double = 0; G.danger = 0;
    G.ai = [];
    var cols = U.AI_COLORS;
    for (var i = 0; i < G.diff.ai; i++) {
      var p = N.safeSpawn(G, 140);
      var a = makeSnake(p.x, p.y, cols[i % cols.length], false);
      a.angle = Math.random() * Math.PI * 2; a.targetAngle = a.angle;
      for (var j = 1; j < 5; j++) {
        a.segments.push({ x: p.x - Math.cos(a.angle) * a.segDist * j, y: p.y - Math.sin(a.angle) * a.segDist * j });
      }
      G.ai.push(a);
    }
    if (withPlayer) {
      var pp = N.safeSpawn(G, 170);
      G.player = makeSnake(pp.x, pp.y, '#2af2ff', true);
      G.player.angle = -Math.PI / 2; G.player.targetAngle = G.player.angle;
      G.player.segments = [{ x: pp.x, y: pp.y }];
      for (var k = 1; k < 6; k++) G.player.segments.push({ x: pp.x, y: pp.y + k * G.player.segDist });
      G.player.targetLen = 6;
      G.player.ghost = 3;                 // 開始3秒は無敵（元作踏襲）
      G.time = CFG.BASE_TIME;
      G.lives = G.diff.lives;
      G.score = 0; G.combo = 0; G.comboTimer = 0; G.maxCombo = 0;
      G.kills = 0; G.orbsEaten = 0; G.pulses = 0;
      G.overdrive = false; G.od = 0; G.lastRank = 'D';
    } else {
      G.player = null;
    }
    var min = withPlayer ? G.diff.orbMin : 10;
    for (var o = 0; o < min; o++) N.spawnOrb(G);
    G.player = withPlayer ? G.player : null;
  }

  /* ---------------- helpers ---------------- */
  function addScore(n) {
    if (n <= 0) return;
    G.score += Math.round(n);
  }

  function selfHit(s) {
    if (!s.alive || s.ghost > 0 || s.stun > 0) return false;
    var upto = s.segments.length - 5;
    for (var i = 0; i < upto; i++) {
      var seg = s.segments[i];
      if (U.dist2(seg.x, seg.y, s.x, s.y) < CFG.HIT_DIST * CFG.HIT_DIST) return true;
    }
    return false;
  }

  function killReward(ai) {
    var gain = Math.round(CFG.KILL_SCORE * G.diff.mul);
    addScore(gain);
    G.kills++;
    G.combo++; G.comboTimer = CFG.COMBO_WINDOW;
    if (G.combo > G.maxCombo) G.maxCombo = G.combo;
    N.floater(G, ai.x, ai.y - 18, '+' + gain, '#ffd93b', 18);
    N.burst(G, ai.x, ai.y, ai.color, 34, 1.5);
    for (var i = 0; i < CFG.KILL_ORBS; i++) {
      var seg = ai.segments[Math.floor(Math.random() * ai.segments.length)] || ai;
      N.spawnOrb(G, U.clamp(seg.x, CFG.WALL + 14, G.W - CFG.WALL - 14), U.clamp(seg.y, CFG.WALL + 14, G.H - CFG.WALL - 14));
    }
    G.shake = Math.max(G.shake, 10);
    G.hitStop = Math.max(G.hitStop, 0.07);
    G.flash = Math.max(G.flash, 0.10);
    if (N.audio) N.audio.kill();
    N.ui.toast(I18.tf('kill', { n: gain }), 'yl');
  }

  function onPlayerDeath(reasonKey) {
    if (G.lives > 0) {
      G.lives--;
      revivePlayer();
      N.ui.toast(I18.t('extraLife'), 'gr');
      if (N.audio) N.audio.hurt();
      G.shake = 12; G.flash = 0.2;
      return;
    }
    endGame(false, reasonKey);
  }

  function revivePlayer() {
    var p = N.safeSpawn(G, 170);
    var pl = G.player;
    pl.x = p.x; pl.y = p.y;
    pl.angle = -Math.PI / 2; pl.targetAngle = pl.angle;
    pl.segments = [{ x: p.x, y: p.y }];
    for (var k = 1; k < 5; k++) pl.segments.push({ x: p.x, y: p.y + k * pl.segDist });
    pl.targetLen = Math.max(5, Math.floor(pl.targetLen * 0.6));
    pl.alive = true; pl.ghost = 3; pl.stun = 0; pl.pulseCd = 0; pl.flash = 0;
    G.combo = 0; G.comboTimer = 0;
    N.burst(G, p.x, p.y, '#2af2ff', 26, 1.2);
  }

  function applyPower(p) {
    var pl = G.player;
    var gain = Math.round(CFG.POWER_SCORE * G.diff.mul);
    addScore(gain);
    G.flash = Math.max(G.flash, 0.12);
    if (N.audio) N.audio.power();
    N.floater(G, p.x, p.y - 14, '+' + gain, '#ffffff', 14);
    var nm = I18.group('buff')[p.type];
    N.ui.toast('◆ ' + nm, p.type === 'ghost' ? 'gr' : 'mg');
    if (p.type === 'speed') pl.speed = Math.min(pl.speed + 1.2, 6);
    else if (p.type === 'ghost') pl.ghost = 5;
    else if (p.type === 'grow') pl.grow(3);
    else if (p.type === 'shrink') G.ai.forEach(function (a) { if (a.alive) a.shrink(2); });
    else if (p.type === 'magnet') G.magnet = 8;
    else if (p.type === 'double') G.double = 8;
    else if (p.type === 'time') {
      G.time = Math.min(99, G.time + 5);
      N.ui.toast(I18.tf('timeAdd', { n: 5 }), 'yl');
    }
    N.burst(G, p.x, p.y, '#ffffff', 14, 1.1);
  }

  function checkRank() {
    var rk = N.rankFor(G.score);
    if (rk.r !== G.lastRank) {
      G.lastRank = rk.r;
      N.ui.toast(I18.t('rankUp') + ' ' + rk.r, 'gr');
      N.floater(G, G.player ? G.player.x : G.W / 2, (G.player ? G.player.y : G.H / 2) - 34, rk.r, rk.c, 22);
      if (N.audio) N.audio.rankUp();
      G.shake = Math.max(G.shake, 6);
    }
  }

  /* ---------------- update ---------------- */
  function update(dt, live) {
    if (live && G.player && G.player.alive) N.input.applySteering(G.player, dt);
    if (live) {
      G.time -= dt;
      if (G.time <= 0) { G.time = 0; endGame(true, 'reasonTime'); return; }
    }

    if (G.player && G.player.alive && live) G.player.update(dt, G);
    for (var i = 0; i < G.ai.length; i++) if (G.ai[i].alive) G.ai[i].update(dt, G);
    N.updateAI(G, dt);

    /* combo decay */
    if (G.comboTimer > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) G.combo = 0; }

    /* orbs */
    for (var oi = G.orbs.length - 1; oi >= 0; oi--) {
      var o = G.orbs[oi];
      o.pulse += dt * 3;
      if (o.kind === 'gold') {
        o.life -= dt;
        if (o.life <= 0) { G.orbs.splice(oi, 1); continue; }
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < CFG.WALL + 12 || o.x > G.W - CFG.WALL - 12) o.vx *= -1;
        if (o.y < CFG.WALL + 12 || o.y > G.H - CFG.WALL - 12) o.vy *= -1;
        o.x = U.clamp(o.x, CFG.WALL + 12, G.W - CFG.WALL - 12);
        o.y = U.clamp(o.y, CFG.WALL + 12, G.H - CFG.WALL - 12);
      }
      /* 吸引（magnet） */
      if (live && G.magnet > 0 && G.player && G.player.alive) {
        var dm = U.dist(o.x, o.y, G.player.x, G.player.y);
        if (dm < 210 && dm > 1) {
          var pull = (1 - dm / 210) * 190 * dt;
          o.x += (G.player.x - o.x) / dm * pull;
          o.y += (G.player.y - o.y) / dm * pull;
        }
      }
      var eaten = false;
      var snakes = N.allSnakes(G);
      for (var si = 0; si < snakes.length; si++) {
        var s = snakes[si];
        if (U.dist2(o.x, o.y, s.x, s.y) < (o.r + 12) * (o.r + 12)) {
          s.grow(s.isPlayer ? 2 : 1);
          if (s.isPlayer && live) {
            G.combo++; G.comboTimer = CFG.COMBO_WINDOW;
            if (G.combo > G.maxCombo) G.maxCombo = G.combo;
            G.orbsEaten++;
            var mult = Math.max(1, G.combo) * G.diff.mul * (G.double > 0 ? 2 : 1);
            var gained = Math.round(o.value * mult);
            addScore(gained);
            N.floater(G, o.x, o.y - 10, '+' + gained, o.color, o.value >= 5 ? 18 : 13);
            N.burst(G, o.x, o.y, o.color, o.value >= 5 ? 14 : 6, 1);
            if (N.audio) N.audio.eat(G.combo);
            checkRank();
          }
          G.orbs.splice(oi, 1);
          eaten = true;
          break;
        }
      }
      if (eaten) continue;
    }
    while (G.orbs.length < G.diff.orbMin) N.spawnOrb(G, undefined, undefined, U.chance(CFG.GOLD_CHANCE) ? 'gold' : undefined);
    if (G.orbs.length > 40) G.orbs.length = 40;

    /* clusters & powers */
    G.clusterT -= dt;
    if (G.clusterT <= 0) { G.clusterT = U.rnd(5, 10); N.spawnCluster(G); }
    if (Math.random() < dt * CFG.POWER_RATE && G.powers.length < CFG.POWER_MAX) N.spawnPower(G);
    for (var pi = G.powers.length - 1; pi >= 0; pi--) {
      var pw = G.powers[pi];
      pw.life -= dt; pw.pulse += dt * 4;
      if (pw.life <= 0) { G.powers.splice(pi, 1); continue; }
      var sn = N.allSnakes(G);
      for (var k = 0; k < sn.length; k++) {
        if (U.dist2(pw.x, pw.y, sn[k].x, sn[k].y) < 22 * 22) {
          if (sn[k].isPlayer && live) applyPower(pw);
          else N.burst(G, pw.x, pw.y, '#8fa6bd', 8, 0.8);
          G.powers.splice(pi, 1);
          break;
        }
      }
    }

    /* pulses */
    for (var wi = G.pulseWaves.length - 1; wi >= 0; wi--) {
      var wv = G.pulseWaves[wi];
      wv.r += CFG.PULSE_SPEED * dt;
      if (wv.r > wv.maxR) { G.pulseWaves.splice(wi, 1); continue; }
      for (var oi2 = 0; oi2 < G.orbs.length; oi2++) {
        var ob = G.orbs[oi2];
        var d = U.dist(ob.x, ob.y, wv.x, wv.y);
        if (d < wv.r && d > wv.r - 46) {
          var a = Math.atan2(wv.owner.y - ob.y, wv.owner.x - ob.x);
          ob.x += Math.cos(a) * 10; ob.y += Math.sin(a) * 10;
        }
      }
      if (live) {
        for (var ai2 = 0; ai2 < G.ai.length; ai2++) {
          var A = G.ai[ai2];
          if (!A.alive || wv.done['a' + A.id]) continue;
          if (A.x > wv.x - wv.r && A.x < wv.x + wv.r && A.y > wv.y - wv.r && A.y < wv.y + wv.r) {
            if (U.dist(A.x, A.y, wv.x, wv.y) <= wv.r) {
              wv.done['a' + A.id] = 1;
              A.stun = Math.max(A.stun, CFG.STUN_TIME * (G.overdrive ? 1.5 : 1));
              A.hunt = 0; A.telegraph = 0; A.flash = 0.35;
              N.burst(G, A.x, A.y, '#ffd93b', 10, 1.1);
              if (N.audio) N.audio.stun();
            }
          }
        }
      }
    }

    /* ---- death rules (元作踏襲 + パルススタン) ---- */
    if (live) {
      if (G.player && G.player.alive && selfHit(G.player)) {
        G.player.die('tail');
        N.burst(G, G.player.x, G.player.y, '#2af2ff', 30, 1.4);
        onPlayerDeath('reasonTail');
      }
      for (var q = 0; q < G.ai.length; q++) {
        var aq = G.ai[q];
        if (aq.alive && selfHit(aq)) {
          aq.die('self');
          if (aq.targetLen > 4) { addScore(Math.round(30 * G.diff.mul)); }
          N.burst(G, aq.x, aq.y, aq.color, 22, 1.2);
        }
      }
      /* 2) プレイヤー頭 vs AIの体 */
      if (G.player && G.player.alive && G.player.ghost <= 0) {
        var donePlayer = false;
        for (var m = 0; m < G.ai.length && !donePlayer; m++) {
          var am = G.ai[m];
          if (!am.alive || am.soft()) continue;
          var pts = am.bodyPoints();
          for (var z = 0; z < pts.length; z++) {
            if (U.dist2(pts[z].x, pts[z].y, G.player.x, G.player.y) < CFG.HIT_DIST * CFG.HIT_DIST) {
              if (z === 0) { am.die('trade'); N.burst(G, am.x, am.y, am.color, 20, 1.2); }
              G.player.die('ai');
              N.burst(G, G.player.x, G.player.y, '#2af2ff', 30, 1.4);
              onPlayerDeath(z === 0 ? 'reasonHead' : 'reasonAi');
              donePlayer = true;
              break;
            }
          }
        }
      }
      /* 3) AI頭 vs プレイヤーの体（無敵中はAIが死ぬ側） */
      if (G.player && G.player.alive) {
        var pb = G.player.bodyPoints();
        for (var n2 = 0; n2 < G.ai.length; n2++) {
          var an = G.ai[n2];
          if (!an.alive || an.soft()) continue;
          for (var z2 = 0; z2 < pb.length; z2++) {
            if (U.dist2(pb[z2].x, pb[z2].y, an.x, an.y) < CFG.HIT_DIST * CFG.HIT_DIST) {
              an.die('player');
              killReward(an);
              break;
            }
          }
        }
      }
      /* AI復活 */
      for (var rr = 0; rr < G.ai.length; rr++) {
        var ar = G.ai[rr];
        if (!ar.alive) {
          ar.deadFor = (ar.deadFor || 0) + dt;
          if (ar.deadFor > G.diff.respawn) reviveSnake(ar, 2);
        }
      }
    } else {
      /* アトラクトモードでも自己破壊した AI は復活 */
      for (var q2 = 0; q2 < G.ai.length; q2++) {
        var aq2 = G.ai[q2];
        if (aq2.alive && selfHit(aq2)) { aq2.die('self'); N.burst(G, aq2.x, aq2.y, aq2.color, 16, 1); }
        if (!aq2.alive) { aq2.deadFor = (aq2.deadFor || 0) + dt; if (aq2.deadFor > 1.6) reviveSnake(aq2, 1); }
      }
    }

    /* overdrive */
    var od = G.combo >= CFG.OD_COMBO;
    if (od !== G.overdrive) {
      G.overdrive = od;
      if (od) { N.ui.toast(I18.t('overdrive'), 'yl'); if (N.audio) N.audio.setIntensity(3); }
      else if (N.audio) N.audio.setIntensity(live ? 1 : 0);
    }
    G.od += ((od ? 1 : 0) - G.od) * Math.min(1, dt * 3);

    /* music intensity by situation */
    if (live && !od) {
      var want = (G.time < 15 || G.combo >= 5) ? 2 : 1;
      if (N.audio) N.audio.setIntensity(want);
    }

    /* danger meter */
    G.danger = 0;
    if (live && G.player && G.player.alive) {
      var dmin = 1e9;
      for (var dgi = 0; dgi < G.ai.length; dgi++) {
        var dg = G.ai[dgi];
        if (!dg.alive) continue;
        var dd = U.dist(dg.x, dg.y, G.player.x, G.player.y);
        if (dd < dmin) dmin = dd;
      }
      G.danger = U.clamp(1 - (dmin - 22) / 60, 0, 1) * 0.85;
    }
    N.ui.setDanger(G.danger);

    N.updateParticles(G, dt);
    if (G.magnet > 0) G.magnet -= dt;
    if (G.double > 0) G.double -= dt;
    if (G.shake > 0) G.shake *= Math.pow(0.88, dt * 60);
    if (G.flash > 0) G.flash *= Math.pow(0.93, dt * 60);
    N.ui.setHud(G);
  }

  /* ---------------- flow ---------------- */
  function menuClass(on) { document.body.classList.toggle('in-menu', !!on); }

  function startRun() {
    if (N.audio) { N.audio.init(); N.audio.startMusic(); }
    G.diffKey = S.diff || 'normal';
    G.diff = DIFF[G.diffKey] || DIFF.normal;
    initWorld(true);
    N.ui.renderScores();
    N.ui.showPanel(null);
    menuClass(false);
    G.state = 'count';
    N.ui.countdown(function () {
      if (G.state !== 'count') return;
      G.state = 'playing';
      lastTime = performance.now();
      if (N.audio) N.audio.setIntensity(1);
    });
  }

  function endGame(timeout, reasonKey) {
    if (G.state === 'over') return;
    G.state = 'over';
    var prevBest = U.bestScore();
    var rec = G.score > 0 && G.score > prevBest;
    U.addScore({ score: G.score, combo: G.maxCombo, kills: G.kills, orbs: G.orbsEaten, diff: G.diffKey, date: Date.now() });
    N.ui.renderScores();
    N.ui.gameOver(G, { timeout: !!timeout, reasonKey: reasonKey || 'reasonAi', record: rec });
    G.shake = 18; G.flash = 0.35;
    if (N.audio) { N.audio.hurt(); N.audio.setIntensity(0); }
    N.ui.setDanger(0);
  }

  function toMenu() {
    G.state = 'menu';
    initWorld(false);
    N.ui.showPanel('menu');
    menuClass(true);
    N.ui.setDanger(0);
    if (N.audio) N.audio.setIntensity(0);
  }

  function pauseGame() {
    if (G.state !== 'playing') return;
    G.state = 'paused';
    N.ui.showPanel('pausePanel');
    N.ui.setDanger(0);
    if (N.audio) N.audio.setIntensity(0);
    var st = I18.group('stat');
    var el = N.ui.els();
    el.pauseSub.textContent = I18.t('pauseSub') + '  ' + st.score + ' ' + G.score + ' / ' + Math.ceil(G.time) + 's';
  }
  function resumeGame() {
    if (G.state !== 'paused') return;
    N.ui.showPanel(null);
    G.state = 'playing';
    lastTime = performance.now();
    if (N.audio) N.audio.setIntensity(G.overdrive ? 3 : 1);
  }

  /* ---------------- loop ---------------- */
  function qualityCheck(dt) {
    if (S.quality !== 'auto') return;
    G.frameAcc += dt; G.frameN++;
    if (G.frameAcc >= 2) {
      G.fps = G.frameN / G.frameAcc;
      if (G.fps < 46 && N.render.getQuality() === 'high') {
        N.render.setQuality('low');
      }
      G.frameAcc = 0; G.frameN = 0;
    }
  }

  function loop(t) {
    var dt = Math.min((t - lastTime) / 1000, 0.05);
    if (dt < 0) dt = 0;
    lastTime = t;
    qualityCheck(dt);

    if (G.state === 'playing') {
      var step = dt;
      if (G.hitStop > 0) { G.hitStop -= dt; step = dt * 0.18; }
      update(step, true);
    } else if (G.state === 'menu' || G.state === 'count') {
      update(dt, false);
    } else if (G.state === 'over') {
      N.updateParticles(G, dt);
      for (var i = 0; i < G.ai.length; i++) if (G.ai[i].alive) G.ai[i].update(dt, G);
      N.updateAI(G, dt);
      if (G.shake > 0) G.shake *= Math.pow(0.88, dt * 60);
      if (G.flash > 0) G.flash *= Math.pow(0.93, dt * 60);
    }
    N.render.frame(G, dt);
    requestAnimationFrame(loop);
  }

  /* ---------------- settings plumbing ---------------- */
  function saveS() { U.saveSettings(S); }

  function applyAudio() {
    if (!N.audio) return;
    N.audio.setSfx(S.sfx); N.audio.setMusic(S.music);
    N.audio.setVolMusic(S.volMusic); N.audio.setVolSfx(S.volSfx);
    N.ui.setAudioButtons(S);
  }

  function wire() {
    N.input.init({
      aim: function (x, y) { if (G.state === 'playing') N.input.aimAt(x, y, G.player); },
      pulse: function () {
        if (G.state !== 'playing' || !G.player || !G.player.alive) return;
        if (G.player.firePulse(G)) { G.pulses++; if (N.audio) N.audio.pulse(); G.shake = Math.max(G.shake, 3); }
      },
      unlock: function () {
        if (!N.audio) return;
        N.audio.init();
        if (S.music) N.audio.startMusic();
      },
      togglePause: function () {
        if (G.state === 'playing') pauseGame();
        else if (G.state === 'paused') resumeGame();
      },
      blurPause: pauseGame,
      confirm: function () {
        var p = N.ui.currentPanel();
        if (p === 'menu') startRun();
        else if (p === 'overPanel') startRun();
        else if (p === 'pausePanel') resumeGame();
      },
      toggleMusic: function () { S.music = !S.music; saveS(); applyAudio(); if (S.music && N.audio) { N.audio.init(); N.audio.startMusic(); } }
    });

    N.ui.init({
      start: function () { if (N.audio) N.audio.ui(); startRun(); },
      again: function () { if (N.audio) N.audio.ui(); startRun(); },
      quit: function () { if (N.audio) N.audio.ui(); toMenu(); },
      resume: function () { if (N.audio) N.audio.ui(); resumeGame(); },
      restart: function () { if (N.audio) N.audio.ui(); startRun(); },
      togglePause: function () { if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame(); },
      openSettings: function () { if (N.audio) N.audio.ui(); N.ui.showPanel('settingsPanel'); },
      closeSettings: function () {
        if (N.audio) N.audio.ui();
        N.ui.showPanel(G.state === 'menu' ? 'menu' : (G.state === 'paused' ? 'pausePanel' : (G.state === 'over' ? 'overPanel' : null)));
      },
      openLang: function () { if (N.audio) N.audio.ui(); N.ui.showPanel('langPanel'); },
      closeLang: function () {
        if (N.audio) N.audio.ui();
        N.ui.showPanel(G.state === 'menu' ? 'menu' : (G.state === 'paused' ? 'pausePanel' : (G.state === 'over' ? 'overPanel' : null)));
      },
      lang: function (l) { if (N.audio) N.audio.ui(); I18.setLang(l); N.ui.applyLang(); },
      diff: function (k) {
        if (N.audio) N.audio.ui();
        S.diff = k; saveS();
        if (G.state !== 'playing' && G.state !== 'count' && G.state !== 'paused') {
          G.diffKey = k; G.diff = DIFF[k]; initWorld(false);
        }
        N.ui.paintDiff(k);
      },
      quality: function (q) {
        S.quality = q; saveS();
        N.render.setQuality(q === 'low' ? 'low' : 'high');
        N.ui.setSeg('quality', q);
      },
      fx: function (f) { S.fx = f; saveS(); N.render.setFx(f); N.ui.setSeg('fx', f); },
      clearScores: function () {
        U.clearScores(); N.ui.renderScores(); N.ui.toast(I18.t('cleared'), 'mg');
      },
      toggleSfx: function () { S.sfx = !S.sfx; saveS(); if (N.audio) N.audio.init(); applyAudio(); },
      toggleMusic: function () { S.music = !S.music; saveS(); if (N.audio) N.audio.init(); applyAudio(); if (S.music) N.audio.startMusic(); },
      volMusic: function (v) { S.volMusic = v; saveS(); N.audio.setVolMusic(v); },
      volSfx: function (v) { S.volSfx = v; saveS(); N.audio.setVolSfx(v); }
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    U.migrateOld();
    S = U.getSettings();
    if (!DIFF[S.diff]) S.diff = 'normal';
    G.diffKey = S.diff; G.diff = DIFF[S.diff];

    N.render.setup();
    var sz = N.render.size();
    G.W = sz.W; G.H = sz.H;
    N.render.setFx(S.fx || 'full');
    N.render.setQuality(S.quality === 'low' ? 'low' : 'high');

    wire();
    N.ui.applyLang();
    applyAudio();
    N.ui.setSeg('quality', S.quality || 'auto');
    N.ui.setSeg('fx', S.fx || 'full');
    N.ui.paintDiff(S.diff);
    if (N.input.isTouch()) document.getElementById('touchPad').classList.remove('hidden');

    window.addEventListener('resize', function () {
      N.render.resize();
      var s = N.render.size();
      G.W = s.W; G.H = s.H;
    });

    initWorld(false);
    N.ui.showPanel('menu');
    menuClass(true);
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  N.game = { boot: boot, G: G, start: startRun, toMenu: toMenu, pause: pauseGame, resume: resumeGame };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
