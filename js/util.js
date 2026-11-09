/* ============================================================
   util — 定数・数学・RNG・セーブデータ
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});

  /* ---- 元作(NeonSerpent)から継承するコア値 ---- */
  var CFG = {
    WALL: 30,                 // 壁の厚み（跳ね返り）
    SEG_DIST: 12,             // セグメント間隔
    HIT_DIST: 7,              // 当たり判定（小さめ・優しめ）※元作踏襲
    AIM_DEADZONE: 40,         // 頭付近のポインターは無視 ※元作踏襲
    BASE_TIME: 60,            // 1ラン60秒 ※元作踏襲
    TURN_LERP: 0.15,          // 旋回追従（60fps換算）
    PLAYER_SPEED: 3.3,
    AI_SPEED: 2.4,
    PULSE_CD: 1.5,            // ※元作踏襲
    PULSE_R: 120,             // ※元作踏襲
    PULSE_PER_LEN: 2,         // 1 length あとの半径加算 ※元作踏襲
    PULSE_SPEED: 300,
    STUN_TIME: 0.9,
    ORB_R: 8,                 // ※元作踏襲
    ORB_MIN: 12,              // 常時この数はフィールド上に維持 ※元作踏襲
    COMBO_WINDOW: 2.0,        // ※元作踏襲
    POWER_RATE: 0.4,          // 秒当たり出現期待値
    POWER_MAX: 3,
    POWER_SCORE: 50,          // ※元作踏襲
    KILL_SCORE: 75,
    KILL_ORBS: 3,
    OD_COMBO: 12,             // OVERDRIVE 進入コンボ
    MAX_PARTICLES: 520,
    GOLD_CHANCE: 0.09,
    CLUSTER_CHANCE: 0.22
  };

  var DIFF = {
    easy:   { key: 'easy',   ai: 2, aiSpeed: 2.05, aggr: 0.28, respawn: 2.8, lives: 1, mul: 1.00, aiPulse: 0.25, orbMin: 13, huntRange: 190 },
    normal: { key: 'normal', ai: 3, aiSpeed: 2.40, aggr: 0.55, respawn: 2.0, lives: 0, mul: 1.25, aiPulse: 0.55, orbMin: 12, huntRange: 250 },
    hard:   { key: 'hard',   ai: 4, aiSpeed: 2.70, aggr: 0.85, respawn: 1.4, lives: 0, mul: 1.60, aiPulse: 0.85, orbMin: 11, huntRange: 320 }
  };

  var RANKS = [
    { r: 'D',  min: 0,    c: '#8fa6bd' },
    { r: 'C',  min: 900,  c: '#4dff9f' },
    { r: 'B',  min: 1800, c: '#2af2ff' },
    { r: 'A',  min: 3000, c: '#a066ff' },
    { r: 'S',  min: 4500, c: '#ffd93b' },
    { r: 'SS', min: 6200, c: '#ff8c36' },
    { r: 'S+', min: 8200, c: '#ff43d6' }
  ];

  function rankFor(score) {
    var out = RANKS[0];
    for (var i = 0; i < RANKS.length; i++) if (score >= RANKS[i].min) out = RANKS[i];
    return out;
  }
  function nextRank(score) {
    for (var i = 0; i < RANKS.length; i++) if (score < RANKS[i].min) return RANKS[i];
    return null;
  }

  /* ---- math ---- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rndInt(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p) { return Math.random() < p; }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
  function norm(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
  function angDiff(a, b) { return norm(b - a); }
  /* 60fps前提のlerpをdt補正 */
  function frameLerp(k, dt) { return 1 - Math.pow(1 - k, dt * 60); }

  /* ---- color helpers（neon palette） ---- */
  function hex2rgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  var PALETTE = ['#2af2ff', '#ff43d6', '#ffd93b', '#4dff9f', '#ff8c36', '#a066ff'];
  var AI_COLORS = ['#ff43d6', '#ff8c36', '#4dff9f', '#a066ff'];

  /* ---- storage ---- */
  var KEY_SCORES = 'nso_scores_v1';
  var KEY_SET = 'nso_settings_v1';
  var KEY_OLD = 'neonSerpentScores';

  function jread(k, def) {
    try { var s = localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch (e) { return def; }
  }
  function jwrite(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  function migrateOld() {
    var old = jread(KEY_OLD, null);
    if (!old || !old.length) return;
    var cur = jread(KEY_SCORES, []);
    var migrated = old.map(function (s) {
      return { score: s.score | 0, combo: s.combo | 0, kills: 0, orbs: 0, diff: 'classic', date: s.date || 0 };
    });
    var joined = cur.concat(migrated);
    joined.sort(function (a, b) { return b.score - a.score; });
    jwrite(KEY_SCORES, joined.slice(0, 20));
    try { localStorage.removeItem(KEY_OLD); } catch (e) {}
  }

  function getScores() { return jread(KEY_SCORES, []); }
  function addScore(rec) {
    var a = getScores();
    a.push(rec);
    a.sort(function (x, y) { return y.score - x.score; });
    a = a.slice(0, 20);
    jwrite(KEY_SCORES, a);
    return a;
  }
  function bestScore() {
    var a = getScores(); var b = 0;
    for (var i = 0; i < a.length; i++) b = Math.max(b, a[i].score);
    return b;
  }
  function clearScores() { jwrite(KEY_SCORES, []); }

  function getSettings() {
    return jread(KEY_SET, { sfx: true, music: true, volMusic: 0.55, volSfx: 0.8, quality: 'auto', fx: 'full', diff: 'normal' });
  }
  function saveSettings(s) { jwrite(KEY_SET, s); }

  /* ---- date fmt ---- */
  function fmtDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var p = function (v) { return (v < 10 ? '0' : '') + v; };
    return p(d.getMonth() + 1) + '/' + p(d.getDate());
  }

  N.CFG = CFG; N.DIFF = DIFF; N.RANKS = RANKS;
  N.rankFor = rankFor; N.nextRank = nextRank;
  N.util = {
    clamp: clamp, lerp: lerp, rnd: rnd, rndInt: rndInt, pick: pick, chance: chance,
    dist: dist, dist2: dist2, norm: norm, angDiff: angDiff, frameLerp: frameLerp,
    hex2rgba: hex2rgba, PALETTE: PALETTE, AI_COLORS: AI_COLORS,
    migrateOld: migrateOld, getScores: getScores, addScore: addScore, bestScore: bestScore, clearScores: clearScores,
    getSettings: getSettings, saveSettings: saveSettings, fmtDate: fmtDate
  };
})();
