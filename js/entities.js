/* ============================================================
   entities — スネーク / オーブ / パワーアップ / パルス / パーティクル
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});
  var CFG = N.CFG, U = N.util;

  var nextId = 1;

  /* ---------------- Snake ---------------- */
  function Snake(x, y, color, isPlayer) {
    this.id = nextId++;
    this.x = x; this.y = y;
    this.color = color;
    this.isPlayer = !!isPlayer;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.speed = isPlayer ? CFG.PLAYER_SPEED : CFG.AI_SPEED;
    this.segments = [{ x: x, y: y }];
    this.segDist = CFG.SEG_DIST;
    this.targetLen = 5;
    this.alive = true;
    this.pulseCd = 0;
    this.ghost = 0;      // 無敵（元作踏襲：開始3秒 + 👻）
    this.stun = 0;       // パルスでスタン（改良版で追加）
    this.aiTimer = 0;
    this.state = 'seek';
    this.hunt = 0;       // hunt 宣言タイマー
    this.telegraph = 0;  // 突進予告の強さ（0..1）
    this.flash = 0;      // 被弾時の点滅
    this.wobble = Math.random() * 6.28;
    this.regen = isPlayer ? 0 : 0.35;   // AIはゆっくり元に戻る（✂の permanency 防止）
    this.kills = 0;
  }

  Snake.prototype = {
    get length() { return this.segments.length; },

    /* 頭＋全セグメント（元作踏襲：頭は body[0]） */
    bodyPoints: function () {
      var a = [{ x: this.x, y: this.y }];
      for (var i = 0; i < this.segments.length; i++) a.push(this.segments[i]);
      return a;
    },

    /* スタン中は双方の接触が無効（soft） */
    soft: function () { return this.stun > 0; },

    update: function (dt, G) {
      if (!this.alive) return;
      var wall = CFG.WALL;
      var move = this.speed * (this.stun > 0 ? 0 : 1);

      var k = U.frameLerp(CFG.TURN_LERP, dt);
      this.angle += U.angDiff(this.angle, this.targetAngle) * k;
      this.x += Math.cos(this.angle) * move * dt * 60;
      this.y += Math.sin(this.angle) * move * dt * 60;

      /* 壁：死なず跳ね返る（元作踏襲） */
      var bounced = false;
      if (this.x < wall) { this.x = wall; this.targetAngle = 0; bounced = true; }
      if (this.x > G.W - wall) { this.x = G.W - wall; this.targetAngle = Math.PI; bounced = true; }
      if (this.y < wall) { this.y = wall; this.targetAngle = Math.PI / 2; bounced = true; }
      if (this.y > G.H - wall) { this.y = G.H - wall; this.targetAngle = -Math.PI / 2; bounced = true; }
      if (bounced) this.telegraph = 0;

      /* セグメント伸長（元作踏襲） */
      var last = this.segments[this.segments.length - 1];
      if (U.dist2(this.x, this.y, last.x, last.y) > this.segDist * this.segDist) {
        this.segments.push({ x: this.x, y: this.y });
        while (this.segments.length > this.targetLen && this.segments.length > 1) this.segments.shift();
      }

      if (this.pulseCd > 0) this.pulseCd -= dt;
      if (this.ghost > 0) this.ghost -= dt;
      if (this.stun > 0) this.stun -= dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.hunt > 0) this.hunt -= dt;
      if (this.telegraph > 0) this.telegraph = Math.max(0, this.telegraph - dt * 1.6);
      this.wobble += dt * 4;
      if (!this.isPlayer && this.regen > 0) {
        if (this.targetLen < 5) this.targetLen = Math.min(5, this.targetLen + this.regen * dt);
      }
    },

    firePulse: function (G) {
      if (!this.alive || this.pulseCd > 0 || this.stun > 0) return false;
      this.pulseCd = CFG.PULSE_CD;
      var r = CFG.PULSE_R + this.length * CFG.PULSE_PER_LEN;
      if (G.overdrive) r *= 1.35;
      G.pulseWaves.push({ x: this.x, y: this.y, r: 12, maxR: r, color: this.color, owner: this, done: {} });
      return true;
    },

    grow: function (n) { this.targetLen = Math.max(2, this.targetLen + n); },
    shrink: function (n) { this.targetLen = Math.max(3, this.targetLen - n); },

    die: function (cause) {
      if (!this.alive) return;
      this.alive = false;
      this.deathCause = cause || 'unknown';
    }
  };

  N.Snake = Snake;

  /* ---------------- spawners ---------------- */
  function allSnakes(G) {
    var a = [];
    if (G.player) a.push(G.player);
    for (var i = 0; i < G.ai.length; i++) if (G.ai[i].alive) a.push(G.ai[i]);
    return a;
  }

  function safeSpawn(G, minDist) {
    for (var tries = 0; tries < 220; tries++) {
      var x = CFG.WALL + 60 + Math.random() * (G.W - 2 * CFG.WALL - 120);
      var y = CFG.WALL + 60 + Math.random() * (G.H - 2 * CFG.WALL - 120);
      var ok = true, list = allSnakes(G);
      for (var i = 0; i < list.length && ok; i++) {
        var s = list[i];
        if (U.dist2(s.x, s.y, x, y) < minDist * minDist) { ok = false; break; }
        for (var j = 0; j < s.segments.length; j++) {
          if (U.dist2(s.segments[j].x, s.segments[j].y, x, y) < minDist * minDist) { ok = false; break; }
        }
      }
      if (ok) return { x: x, y: y };
    }
    return { x: G.W / 2, y: G.H / 2 };
  }

  function spawnOrb(G, x, y, kind) {
    var gold = kind === 'gold';
    var o = {
      x: x !== undefined ? x : CFG.WALL + 20 + Math.random() * (G.W - 2 * CFG.WALL - 40),
      y: y !== undefined ? y : CFG.WALL + 20 + Math.random() * (G.H - 2 * CFG.WALL - 40),
      color: gold ? '#ffd93b' : U.pick(U.PALETTE),
      value: gold ? 5 : 1,
      kind: gold ? 'gold' : 'normal',
      pulse: Math.random() * 6.28,
      r: gold ? CFG.ORB_R + 3 : CFG.ORB_R,
      vx: gold ? U.rnd(-22, 22) : 0,
      vy: gold ? U.rnd(-22, 22) : 0,
      life: gold ? 9 : 0
    };
    G.orbs.push(o);
    return o;
  }

  /* 弧状に並ぶクラスター（改良版で追加：まとめて食べると熱い） */
  function spawnCluster(G) {
    var p = safeSpawn(G, 90);
    var n = U.rndInt(3, 5);
    var a0 = Math.random() * Math.PI * 2;
    var curve = U.rnd(-0.5, 0.5);
    for (var i = 0; i < n; i++) {
      var a = a0 + curve * (i - n / 2);
      var d = i * (CFG.ORB_R * 2.6);
      spawnOrb(G, U.clamp(p.x + Math.cos(a) * d, CFG.WALL + 14, G.W - CFG.WALL - 14),
                  U.clamp(p.y + Math.sin(a) * d, CFG.WALL + 14, G.H - CFG.WALL - 14));
    }
  }

  var POWER_TYPES = ['speed', 'ghost', 'grow', 'shrink', 'magnet', 'double', 'time'];
  function spawnPower(G) {
    var p = safeSpawn(G, 70);
    G.powers.push({
      x: p.x, y: p.y,
      type: U.pick(POWER_TYPES),
      life: 11, pulse: 0
    });
  }

  function burst(G, x, y, color, n, power) {
    n = n || 8; power = power || 1;
    var room = CFG.MAX_PARTICLES - G.parts.length;
    n = Math.min(n, Math.max(0, room));
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = U.rnd(1.2, 7) * power;
      G.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: U.rnd(1.6, 3.1), color: color, size: U.rnd(2, 5.5)
      });
    }
  }

  function floater(G, x, y, txt, color, size) {
    if (G.floaters.length > 40) G.floaters.shift();
    G.floaters.push({ x: x, y: y, txt: txt, color: color, life: 1, size: size || 13 });
  }

  function updateParticles(G, dt) {
    for (var i = G.parts.length - 1; i >= 0; i--) {
      var p = G.parts[i];
      p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
      p.vx *= 0.965; p.vy *= 0.965;
      p.life -= dt * p.decay;
      if (p.life <= 0) G.parts.splice(i, 1);
    }
    for (var j = G.floaters.length - 1; j >= 0; j--) {
      var f = G.floaters[j];
      f.y -= dt * 34; f.life -= dt * 1.15;
      if (f.life <= 0) G.floaters.splice(j, 1);
    }
  }

  N.spawnOrb = spawnOrb;
  N.spawnCluster = spawnCluster;
  N.spawnPower = spawnPower;
  N.safeSpawn = safeSpawn;
  N.allSnakes = allSnakes;
  N.burst = burst;
  N.floater = floater;
  N.updateParticles = updateParticles;
  N.POWER_TYPES = POWER_TYPES;
})();
