/* ============================================================
   input — マウス狙い / タッチ狙い+ダブルタップ / キーボード旋回 / PULSE
   （元作の「頭から40px以内は無視」「ダブルタップでパルス」を踏襲）
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});
  var CFG = N.CFG;

  var cb = {};
  var pointer = { x: 0, y: 0, active: false };
  var keys = {};
  var lastTap = 0;
  var touchMode = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  function aimAt(x, y, player) {
    if (!player || !player.alive) return;
    var dx = x - player.x, dy = y - player.y;
    if (dx * dx + dy * dy < CFG.AIM_DEADZONE * CFG.AIM_DEADZONE) return;
    player.targetAngle = Math.atan2(dy, dx);
  }

  function pulse() {
    if (cb.pulse) cb.pulse();
  }

  function init(handlers) {
    cb = handlers || {};
    var cv = document.getElementById('stage');

    cv.addEventListener('mousemove', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      if (cb.aim) cb.aim(pointer.x, pointer.y);
    });
    cv.addEventListener('mousedown', function (e) {
      if (cb.unlock) cb.unlock();
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      if (cb.aim) cb.aim(pointer.x, pointer.y);
    });

    cv.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (cb.unlock) cb.unlock();
      var t = e.touches[0];
      pointer.x = t.clientX; pointer.y = t.clientY; pointer.active = true;
      if (cb.aim) cb.aim(pointer.x, pointer.y);
      var now = Date.now();
      if (now - lastTap < 320) pulse();
      lastTap = now;
    }, { passive: false });
    cv.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var t = e.touches[0];
      pointer.x = t.clientX; pointer.y = t.clientY;
      if (cb.aim) cb.aim(pointer.x, pointer.y);
    }, { passive: false });

    window.addEventListener('keydown', function (e) {
      var k = e.code;
      if (keys[k]) return;
      keys[k] = true;
      if (k === 'Space') {
        e.preventDefault();
        if (cb.unlock) cb.unlock();
        pulse();
      } else if (k === 'Escape' || k === 'KeyP') {
        e.preventDefault();
        if (cb.togglePause) cb.togglePause();
      } else if (k === 'Enter' || k === 'NumpadEnter') {
        if (cb.confirm) cb.confirm();
      } else if (k === 'KeyM') {
        if (cb.toggleMusic) cb.toggleMusic();
      }
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    window.addEventListener('blur', function () { keys = {}; if (cb.blurPause) cb.blurPause(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && cb.blurPause) cb.blurPause();
    });

    var btn = document.getElementById('btnPulseTouch');
    btn.addEventListener('touchstart', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (cb.unlock) cb.unlock();
      pulse();
    }, { passive: false });
    btn.addEventListener('mousedown', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (cb.unlock) cb.unlock();
      pulse();
    });

    if (touchMode) document.body.classList.add('touch');
  }

  /* キーボード旋回（左右）。返回 true ならキーで操縦中 */
  function applySteering(player, dt) {
    if (!player || !player.alive) return false;
    var dir = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dir -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dir += 1;
    if (!dir) return false;
    player.targetAngle = N.util.norm(player.targetAngle + dir * 3.4 * dt);
    return true;
  }

  N.input = {
    init: init, aimAt: aimAt, applySteering: applySteering,
    isTouch: function () { return touchMode; },
    keys: function () { return keys; },
    pointer: pointer
  };
})();
