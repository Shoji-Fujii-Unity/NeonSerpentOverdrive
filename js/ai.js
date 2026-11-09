/* ============================================================
   ai — 旧作の「オーブ追い＋プレイヤー優先エリア回避」を発展させた
   サンプルスティアリング（危険予測・自己尾部回避・hunt）
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});
  var CFG = N.CFG, U = N.util;

  var LOOK = [16, 34, 56, 84];      // 前方予測サンプル距離
  var SPAN = 1.05;                  // 候補角の探索幅（±約60度）
  var N_CAND = 9;

  function nearestOrbGain(a, G) {
    var best = null, bs = -1e9, dir = 0;
    for (var i = 0; i < G.orbs.length; i++) {
      var o = G.orbs[i];
      var d = U.dist(a.x, a.y, o.x, o.y);
      if (d > 420) continue;
      /* 元作踏襲：プレイヤーが極めて近いオーブは争いにくい → 減点 */
      var pw = 1;
      if (G.player && G.player.alive && U.dist(o.x, o.y, G.player.x, G.player.y) < 62) pw = 0.35;
      var s = (o.value >= 5 ? 1.6 : 1) * (420 - d) * pw;
      if (s > bs) { bs = s; best = o; dir = Math.atan2(o.y - a.y, o.x - a.x); }
    }
    return best ? { orb: best, angle: dir, strength: bs / 420 } : null;
  }

  function dangerPoints(a, G, hunting) {
    var pts = [], i, j, R2 = 170 * 170;
    /* 1) 自分の尾部（頭の直近4点は除外＝元作の selfHit 相当） */
    var upto = a.segments.length - 5;
    for (i = 0; i < upto; i++) {
      var s0 = a.segments[i];
      if (U.dist2(s0.x, s0.y, a.x, a.y) < R2) pts.push({ x: s0.x, y: s0.y, w: 1.15 });
    }
    /* 2) 他AI */
    for (i = 0; i < G.ai.length; i++) {
      var o = G.ai[i];
      if (o === a || !o.alive) continue;
      var pts0 = o.bodyPoints();
      for (j = 0; j < pts0.length; j++) {
        var p0 = pts0[j];
        if (U.dist2(p0.x, p0.y, a.x, a.y) > R2) continue;
        pts.push({ x: p0.x, y: p0.y, w: j === 0 ? 1.0 : 0.72 });
      }
    }
    /* 3) プレイヤー：hunt中はリスク承知で重みを落とす */
    var pl = G.player;
    if (pl && pl.alive) {
      var pts1 = pl.bodyPoints();
      var wBody = hunting ? 0.34 : 1.2;
      var wHead = hunting ? 0.2 : 1.45;
      for (j = 0; j < pts1.length; j++) {
        var p1 = pts1[j];
        if (U.dist2(p1.x, p1.y, a.x, a.y) > R2) continue;
        pts.push({ x: p1.x, y: p1.y, w: j === 0 ? wHead : wBody });
      }
    }
    return pts;
  }

  function scoreCandidate(a, G, ang, pts, goal, hunting) {
    var sc = 0;
    /* 慣性：今の向きを維持したい */
    sc += 0.55 * Math.cos(U.angDiff(a.angle, ang));

    /* 目標への引力 */
    if (goal) sc += goal.strength * 1.35 * Math.cos(U.angDiff(goal.angle, ang));

    /* 前方リスク */
    for (var s = 0; s < LOOK.length; s++) {
      var d = LOOK[s];
      var px = a.x + Math.cos(ang) * d, py = a.y + Math.sin(ang) * d;
      /* 壁 */
      var wall = CFG.WALL;
      var m = Math.min(px - wall, G.W - wall - px, py - wall, G.H - wall - py);
      if (m < 0) return -999;
      if (m < 46) sc -= (46 - m) / 46 * (1.15 - s * 0.2);
      /* 危険点 */
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dd = U.dist2(px, py, p.x, p.y);
        var rr = (CFG.HIT_DIST + 20 + s * 3);
        if (dd < rr * rr) sc -= (1 - Math.sqrt(dd) / rr) * p.w * (1.5 - s * 0.22);
      }
    }
    return sc;
  }

  function think(a, G, dt) {
    var D = G.diff;
    var pl = G.player;
    var hunting = a.hunt > 0;

    /* hunt の宣言 */
    if (!hunting && pl && pl.alive && a.length > pl.length * 1.1 && a.stun <= 0) {
      var dp = U.dist(a.x, a.y, pl.x, pl.y);
      if (dp < D.huntRange && U.chance(D.aggr * 0.5)) {
        a.hunt = U.rnd(0.9, 1.9);
        hunting = true;
      }
    }

    var goal = null;
    if (hunting && pl && pl.alive) {
      /* 頭を追うのではなく、頭の少し先を切るコース取る */
      var lead = Math.min(0.5, U.dist(a.x, a.y, pl.x, pl.y) / (a.speed * 60 + 1));
      var tx = pl.x + Math.cos(pl.angle) * pl.speed * 60 * lead;
      var ty = pl.y + Math.sin(pl.angle) * pl.speed * 60 * lead;
      goal = { angle: Math.atan2(ty - a.y, tx - a.x), strength: 1.15 };
      /* 予告：ほぼ正面かつ近距離なら telegraph */
      var dd = U.dist(a.x, a.y, pl.x, pl.y);
      var align = Math.cos(U.angDiff(a.angle, Math.atan2(pl.y - a.y, pl.x - a.x)));
      if (dd < 230 && align > 0.93) a.telegraph = Math.max(a.telegraph, (1 - dd / 230) * 1.2);
    } else {
      goal = nearestOrbGain(a, G);
      if (!goal) {
        /* オーブが遠い場合は内側へゆっくり戻りながらランダム探索 */
        var cx = (G.W / 2 - a.x), cy = (G.H / 2 - a.y);
        var dc = Math.hypot(cx, cy);
        if (dc > 220) goal = { angle: Math.atan2(cy, cx), strength: 0.28 };
      }
    }

    var pts = dangerPoints(a, G, hunting);
    var best = a.angle, bs = -1e9;
    for (var i = 0; i < N_CAND; i++) {
      var t = (i / (N_CAND - 1)) * 2 - 1;
      var ang = U.norm(a.angle + t * SPAN);
      var sc = scoreCandidate(a, G, ang, pts, goal, hunting);
      if (sc > bs) { bs = sc; best = ang; }
    }
    /* 全面的に危険な状況（詰み）なら後退候補も評価 */
    if (bs < -0.5) {
      var back = U.norm(a.angle + Math.PI);
      var s2 = scoreCandidate(a, G, back, pts, null, hunting) + 0.3;
      if (s2 > bs) best = back;
    }
    a.targetAngle = best;

    /* AIパルス：周囲にオーブが集まっているとき（難易度で発生率変化） */
    if (!hunting && a.stun <= 0 && U.chance(D.aiPulse * 0.06)) {
      var near = 0;
      for (var k = 0; k < G.orbs.length; k++) {
        if (U.dist2(G.orbs[k].x, G.orbs[k].y, a.x, a.y) < 150 * 150) near++;
      }
      if (near >= 3) a.firePulse(G);
    }
  }

  function updateAI(G, dt) {
    for (var i = 0; i < G.ai.length; i++) {
      var a = G.ai[i];
      if (!a.alive) continue;
      a.aiTimer -= dt;
      if (a.aiTimer <= 0) {
        a.aiTimer = U.rnd(0.16, 0.34);
        think(a, G, dt);
      }
    }
  }

  N.updateAI = updateAI;
})();
