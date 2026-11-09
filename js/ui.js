/* ============================================================
   ui — HUD / パネル / トースト / 記録表示 / カウントダウン
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});
  var CFG = N.CFG, U = N.util, I18 = N.i18n;
  var gs = window.gsap || null;

  var el = {}, cache = {}, cb = {}, sigBuffs = '';

  function $(id) { return document.getElementById(id); }

  function init(handlers) {
    cb = handlers || {};
    ['vScore','vTime','vLen','vKills','vLives','livesWrap','rankChip','rankFill','rankNext',
     'comboWrap','comboText','comboFill','buffs','pulseMeter','pulseFill','pulseKey',
     'menu','menuTag','logoSub','diffChips','btnStart','scoreList','howtoList','menuFoot',
     'pausePanel','pauseTitle','pauseSub','pauseFoot','btnResume','btnRestart','btnQuit',
     'overPanel','overTitle','overReason','overScore','overRank','newRecord','overStats','overNext','btnAgain','btnMenu',
     'settingsPanel','setTitle','tgMusic','tgSfx','volMusic','volSfx','segQuality','segFx','segDiff','btnClearScores','btnCloseSettings',
     'langPanel','btnCloseLang','countdown','countNum','toastWrap','danger','crt',
     'btnSfx','btnMusic','btnSettings','btnLang','btnPause','touchPad','btnPulseTouch','pulseTouchLabel','pulseTouchRing','touchHint'
    ].forEach(function (k) { el[k] = $(k); });

    /* difficulty chips (menu + settings) */
    buildChips(el.diffChips, true);
    buildChips(el.segDiff, false);

    /* static buttons */
    el.btnStart.onclick = function () { cb.start && cb.start(); };
    el.btnAgain.onclick = function () { cb.again && cb.again(); };
    el.btnMenu.onclick = function () { cb.quit && cb.quit(); };
    el.btnResume.onclick = function () { cb.resume && cb.resume(); };
    el.btnRestart.onclick = function () { cb.restart && cb.restart(); };
    el.btnQuit.onclick = function () { cb.quit && cb.quit(); };
    el.btnPause.onclick = function () { cb.togglePause && cb.togglePause(); };
    el.btnCloseSettings.onclick = function () { cb.closeSettings && cb.closeSettings(); };
    el.btnCloseLang.onclick = function () { cb.closeLang && cb.closeLang(); };
    el.btnClearScores.onclick = function () { cb.clearScores && cb.clearScores(); };
    el.btnSfx.onclick = function () { cb.toggleSfx && cb.toggleSfx(); };
    el.btnMusic.onclick = function () { cb.toggleMusic && cb.toggleMusic(); };
    el.btnSettings.onclick = function () { cb.openSettings && cb.openSettings(); };
    el.btnLang.onclick = function () { cb.openLang && cb.openLang(); };
    el.volMusic.oninput = function () { cb.volMusic && cb.volMusic(+this.value / 100); };
    el.volSfx.oninput = function () { cb.volSfx && cb.volSfx(+this.value / 100); };
    el.tgMusic.onclick = function () { cb.toggleMusic && cb.toggleMusic(); };
    el.tgSfx.onclick = function () { cb.toggleSfx && cb.toggleSfx(); };
    Array.prototype.forEach.call(el.segQuality.querySelectorAll('button'), function (b) {
      b.onclick = function () { cb.quality && cb.quality(b.dataset.q); };
    });
    Array.prototype.forEach.call(el.segFx.querySelectorAll('button'), function (b) {
      b.onclick = function () { cb.fx && cb.fx(b.dataset.fx); };
    });
    Array.prototype.forEach.call(document.querySelectorAll('.lang-btn'), function (b) {
      b.onclick = function () { cb.lang && cb.lang(b.dataset.lang); };
    });
  }

  function buildChips(host, withNote) {
    if (!host) return;
    host.innerHTML = '';
    ['easy', 'normal', 'hard'].forEach(function (k) {
      var b = document.createElement('button');
      b.className = 'chip';
      b.dataset.diff = k;
      b.textContent = I18.t(k === 'easy' ? 'diffEasy' : k === 'normal' ? 'diffNormal' : 'diffHard');
      b.onclick = function () { cb.diff && cb.diff(k); };
      host.appendChild(b);
    });
    if (withNote) {
      var p = document.createElement('div');
      p.className = 'diff-note';
      p.id = 'diffNote';
      host.parentNode.insertBefore(p, host.nextSibling);
    }
  }

  /* ---------- language ---------- */
  function applyLang() {
    var t = function (k) { return I18.t(k); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (n) {
      n.textContent = I18.t(n.dataset.i18n);
    });
    el.menuTag.innerHTML = t('tagline');
    el.btnStart.textContent = t('start');
    el.btnAgain.textContent = t('again');
    el.btnMenu.textContent = t('menu');
    el.btnResume.textContent = t('resume');
    el.btnRestart.textContent = t('restart');
    el.btnQuit.textContent = t('quit');
    el.btnCloseSettings.textContent = t('close');
    el.btnCloseLang.textContent = t('close');
    el.btnClearScores.textContent = t('clearScores');
    el.setTitle.textContent = t('settings');
    el.pauseTitle.textContent = t('pauseTitle');
    el.pauseFoot.textContent = t('pauseFoot');
    el.pulseKey.textContent = N.input.isTouch() ? 'TAP' : t('pulseKey');
    el.pulseTouchLabel.textContent = t('pulseLabel');
    el.touchHint.textContent = t('touchHint');
    el.menuFoot.textContent = t('foot');
    el.howtoList.innerHTML = (I18.group('howtoList') || []).map(function (s) { return '<li>' + s + '</li>'; }).join('');
    /* difficulty chips label + note */
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (b) {
      b.textContent = t(b.dataset.diff === 'easy' ? 'diffEasy' : b.dataset.diff === 'normal' ? 'diffNormal' : 'diffHard');
    });
    /* quality / fx segmented labels */
    var qn = I18.group('qualityNames'), fn = I18.group('fxNames');
    Array.prototype.forEach.call(el.segQuality.querySelectorAll('button'), function (b) { b.textContent = qn[b.dataset.q]; });
    Array.prototype.forEach.call(el.segFx.querySelectorAll('button'), function (b) { b.textContent = fn[b.dataset.fx]; });
    document.documentElement.lang = I18.getLang();
    renderScores();
    paintDiff(N.G ? N.G.diffKey : (U.getSettings().diff || 'normal'));
  }

  function paintDiff(key) {
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (b) {
      b.classList.toggle('active', b.dataset.diff === key);
    });
    Array.prototype.forEach.call(el.segDiff.querySelectorAll('button, .chip'), function (b) {
      b.classList.toggle('active', b.dataset.diff === key);
    });
    var note = $('diffNote');
    if (note) note.textContent = I18.t('diffNote' + key.charAt(0).toUpperCase() + key.slice(1));
  }

  /* ---------- scores ---------- */
  function renderScores() {
    var list = U.getScores().slice(0, 8);
    if (!list.length) { el.scoreList.innerHTML = '<div class="hs-empty">' + I18.t('noScores') + '</div>'; return; }
    el.scoreList.innerHTML = list.map(function (s, i) {
      return '<div class="hs-row"><span class="n">#' + (i + 1) + '</span><span class="s">' + s.score +
        '</span><span class="d">' + (s.diff || 'normal').toUpperCase() +
        '</span><span class="m">×' + (s.combo || 0) + ' / ' + (s.kills || 0) + 'KO · ' + U.fmtDate(s.date) + '</span></div>';
    }).join('');
  }

  /* ---------- panels ---------- */
  var PANELS = ['menu', 'pausePanel', 'overPanel', 'settingsPanel', 'langPanel'];
  function showPanel(name) {
    PANELS.forEach(function (p) {
      var on = (p === name);
      if (on === !el[p].classList.contains('hidden')) return;
      el[p].classList.toggle('hidden', !on);
      if (on && gs) gs.fromTo(el[p], { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' });
    });
  }
  function currentPanel() {
    for (var i = 0; i < PANELS.length; i++) if (!el[PANELS[i]].classList.contains('hidden')) return PANELS[i];
    return null;
  }

  /* ---------- countdown ---------- */
  function countdown(done) {
    var wrap = el.countdown, num = el.countNum;
    wrap.style.display = 'flex';
    var seq = ['3', '2', '1', I18.t('countdownGo')];
    var i = 0;
    function step() {
      num.textContent = seq[i];
      num.style.color = i === 3 ? '#4dff9f' : '#2af2ff';
      if (N.audio) N.audio.countdown(i);
      if (gs) {
        gs.killTweensOf(num);
        gs.fromTo(num, { scale: i === 3 ? 1.9 : 1.7, opacity: 0, rotation: -6 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.32, ease: 'back.out(2)' });
      }
      i++;
      if (i < seq.length) setTimeout(step, i === 3 ? 480 : 700);
      else setTimeout(function () {
        if (gs) gs.to(num, { scale: 2.4, opacity: 0, duration: 0.36, ease: 'power2.in' });
        else wrap.style.display = 'none';
        setTimeout(function () { wrap.style.display = 'none'; num.style.opacity = 1; num.style.transform = ''; }, 400);
        done && done();
      }, 380);
    }
    step();
  }

  /* ---------- toasts ---------- */
  function toast(text, cls) {
    var d = document.createElement('div');
    d.className = 'toast' + (cls ? ' ' + cls : '');
    d.textContent = text;
    el.toastWrap.appendChild(d);
    if (gs) {
      gs.fromTo(d, { y: -14, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
      gs.to(d, { opacity: 0, y: -10, duration: 0.4, delay: 1.1, ease: 'power2.in', onComplete: function () { d.remove(); } });
    } else {
      setTimeout(function () { d.remove(); }, 1500);
    }
    while (el.toastWrap.childNodes.length > 4) el.toastWrap.removeChild(el.toastWrap.firstChild);
  }

  /* ---------- HUD ---------- */
  function setHud(G) {
    if (cache.score !== G.score) { el.vScore.textContent = G.score; cache.score = G.score; }
    var tl = Math.max(0, Math.ceil(G.time));
    if (cache.time !== tl) {
      el.vTime.textContent = tl;
      el.vTime.parentNode.classList.toggle('low', tl <= 10);
      cache.time = tl;
    }
    var len = G.player ? G.player.length : 0;
    if (cache.len !== len) { el.vLen.textContent = len; cache.len = len; }
    if (cache.kills !== G.kills) { el.vKills.textContent = G.kills; cache.kills = G.kills; }
    if (cache.lives !== G.lives) {
      el.vLives.textContent = G.lives; cache.lives = G.lives;
      document.body.classList.toggle('has-lives', G.diff.lives > 0);
    }
    var rk = N.rankFor(G.score), nx = N.nextRank(G.score);
    if (cache.rank !== rk.r) {
      el.rankChip.textContent = rk.r;
      el.rankChip.style.color = rk.c;
      el.rankNext.textContent = nx ? nx.r : '★';
      cache.rank = rk.r;
    }
    if (nx) {
      var p = (G.score - rk.min) / (nx.min - rk.min);
      el.rankFill.style.width = (100 * Math.max(0, Math.min(1, p))) + '%';
    } else el.rankFill.style.width = '100%';

    /* combo */
    var on = G.combo >= 2;
    el.comboWrap.classList.toggle('on', on);
    if (on) {
      el.comboText.textContent = I18.group('combo') + ' ×' + G.combo;
      el.comboFill.style.width = (100 * G.comboTimer / CFG.COMBO_WINDOW) + '%';
    }
    document.body.classList.toggle('od', !!G.overdrive);

    /* pulse meter */
    var ready = G.player && G.player.pulseCd <= 0;
    el.pulseMeter.classList.toggle('ready', !!ready);
    var pcd = G.player ? Math.max(0, G.player.pulseCd / CFG.PULSE_CD) : 0;
    el.pulseFill.style.width = (100 * (1 - pcd)) + '%';
    el.btnPulseTouch.classList.toggle('cool', !ready);
    if (el.pulseTouchRing) el.pulseTouchRing.style.opacity = ready ? 0.9 : 0.22;

    /* buffs */
    var sig = '', items = [];
    if (G.player && G.player.ghost > 0) { sig += 'g' + Math.ceil(G.player.ghost); items.push(['👻', 'ghost', Math.ceil(G.player.ghost)]); }
    if (G.magnet > 0) { sig += 'm' + Math.ceil(G.magnet); items.push(['🧲', 'magnet', Math.ceil(G.magnet)]); }
    if (G.double > 0) { sig += 'd' + Math.ceil(G.double); items.push(['✦', 'double', Math.ceil(G.double)]); }
    if (G.player && G.player.speed > CFG.PLAYER_SPEED + 0.01) { sig += 's' + G.player.speed.toFixed(1); items.push(['⚡', 'speed', 0]); }
    if (sig !== sigBuffs) {
      sigBuffs = sig;
      el.buffs.innerHTML = items.map(function (it) {
        return '<span class="buff">' + it[0] + ' ' + I18.group('buff')[it[1]] + (it[2] ? ' <b>' + it[2] + '</b>' : '') + '</span>';
      }).join('');
    }
  }

  function setDanger(v) { el.danger.style.opacity = Math.max(0, Math.min(1, v)); }

  /* ---------- game over ---------- */
  function gameOver(G, info) {
    el.overTitle.textContent = info.timeout ? I18.t('timeUp') : I18.t('over');
    el.overReason.textContent = I18.t(info.reasonKey);
    el.overScore.textContent = G.score;
    var rk = N.rankFor(G.score);
    el.overRank.textContent = rk.r;
    el.overRank.style.color = rk.c;
    var nx = N.nextRank(G.score);
    el.overNext.textContent = nx ? I18.tf('nextRank', { r: nx.r, n: nx.min - G.score }) : I18.t('reachedMax');

    var st = I18.group('stat');
    el.overStats.innerHTML = [
      [st.score, G.score], [st.maxCombo, '×' + G.maxCombo], [st.kills, G.kills],
      [st.orbs, G.orbsEaten], [st.length, G.player ? G.player.length : 0], [st.pulse, G.pulses]
    ].map(function (r) { return '<div><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>'; }).join('');

    if (info.record) {
      el.newRecord.classList.remove('hidden');
      el.newRecord.textContent = I18.t('newRecord');
      if (window.confetti) {
        try {
          window.confetti({ particleCount: 130, spread: 80, origin: { y: 0.35 }, colors: ['#2af2ff', '#ff43d6', '#ffd93b', '#4dff9f'], disableForReducedMotion: true });
          setTimeout(function () { window.confetti({ particleCount: 70, angle: 60, spread: 55, origin: { x: 0, y: 0.5 } }); }, 220);
          setTimeout(function () { window.confetti({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1, y: 0.5 } }); }, 340);
        } catch (e) {}
      }
    } else el.newRecord.classList.add('hidden');

    showPanel('overPanel');
    if (gs) {
      gs.fromTo(el.overScore, { textContent: 0 }, { textContent: G.score, duration: 0.9, ease: 'power2.out', snap: { textContent: 1 } });
      gs.fromTo('.stat-grid > div', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, delay: 0.15, ease: 'power2.out' });
    }
  }

  function setAudioButtons(S) {
    el.btnSfx.classList.toggle('active', S.sfx); el.btnSfx.classList.toggle('off', !S.sfx);
    el.btnSfx.textContent = S.sfx ? '🔊' : '🔇';
    el.btnMusic.classList.toggle('active', S.music); el.btnMusic.classList.toggle('off', !S.music);
    el.tgMusic.classList.toggle('active', S.music);
    el.tgSfx.classList.toggle('active', S.sfx);
    el.volMusic.value = Math.round(S.volMusic * 100);
    el.volSfx.value = Math.round(S.volSfx * 100);
  }

  function setSeg(name, value) {
    var host = name === 'quality' ? el.segQuality : el.segFx;
    Array.prototype.forEach.call(host.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b.dataset.q === value || b.dataset.fx === value);
    });
  }

  N.ui = {
    init: init, applyLang: applyLang, paintDiff: paintDiff, renderScores: renderScores,
    showPanel: showPanel, currentPanel: currentPanel, countdown: countdown, toast: toast,
    setHud: setHud, setDanger: setDanger, gameOver: gameOver, setAudioButtons: setAudioButtons, setSeg: setSeg,
    els: function () { return el; }
  };
})();
