/* ============================================================
   i18n — 日本語 / English / 한국어 / 中文
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});

  var STR = {
    ja: {
      score: 'スコア', time: '時間', highscores: 'ハイスコア', howto: '遊び方', settings: '設定',
      music: 'ミュージック', sfx: '効果音', quality: 'グラフィック', effects: '演出', difficulty: '難易度', scores: '保存された記録',
      tagline: '光るオーブを呑み込んで成長し、60秒でハイスコアを狙うネオン・アクションサバイバル。<br>AIの体に触れれば死——だが、自分の体でなすりつければ撃破できる。',
      start: 'ゲームスタート', again: 'リトライ', menu: 'メニュー', resume: '再開', restart: '最初から', quit: 'メニューへ',
      close: 'とじる', clearScores: '記録を消去', cleared: '記録を消去了しました',
      diffEasy: 'イージー', diffNormal: 'ノーマル', diffHard: 'ハード',
      diffNoteEasy: 'AI 2体・やり直し1回・スコア×1.0　まずは操作を確かめるコース',
      diffNoteNormal: 'AI 3体・スコア×1.25　元作に最も近い標準コース',
      diffNoteHard: 'AI 4体・huntするAI・スコア×1.6　立ち回りが問われる上級コース',
      howtoList: [
        'マウス／タッチで<b>頭の向きたい方向を指す</b>（頭から40px以内は無視）',
        'キーボードなら <b>←→／AD</b> でも旋回できる',
        '<b>スペース</b>／ダブルタップ／PULSEで<b>パルス</b>：オーブを引き寄せ、AIをスタン',
        '自分の尻尾・AIの体に当たると<b>死亡</b>。壁は跳ね返るだけ',
        'AIの頭を自分の体に当てさせると<b>撃破+75</b>。零れたオーブも回収できる',
        '2秒以内に食べ続けると<b>コンボ倍率</b>が上昇、x12で<b>オーバードライブ</b>',
        'ダイヤの<b>パワーアップ</b>：加速／無敵／伸長／AI短縮／吸引／2倍／時間延長'
      ],
      buff: { speed: '加速', ghost: '無敵', grow: '伸長', shrink: 'AI短縮', magnet: '吸引', double: '倍取り', time: '時間+' },
      stat: { score: 'スコア', maxCombo: '最大コンボ', kills: '撃破', orbs: 'オーブ', length: '長さ', timeLeft: '残時間', diff: '難易度', pulse: 'パルス' },
      over: 'ゲームオーバー', timeUp: 'タイムアップ',
      reasonTail: '自分の尻尾に触れた', reasonAi: 'AIの体に頭が触れた', reasonHead: 'AIの頭と正面衝突した', reasonTime: '60秒が過ぎた',
      newRecord: '🏆 新記録！', noScores: 'まだ記録がありません',
      pauseTitle: 'ポーズ', pauseSub: 'ゲームは止まっています', pauseFoot: 'Esc / P で再開',
      rankUp: 'ランクアップ！', overdrive: 'オーバードライブ！', kill: '撃破 +{n}', stun: 'スタン！', timeAdd: '+{n}秒',
      extraLife: 'エクストラライフ', magnetOn: 'オーブ吸引', doubleOn: 'スコア2倍', nextRank: '次の {r} まで {n} ポイント',
      reachedMax: '全ランク到達！', combo: 'コンボ', qualityNames: { auto: '自動', high: '高', low: '低' },
      fxNames: { full: '全開', soft: '控えめ', off: 'オフ' },
      touchHint: 'ドラッグで旋回／ダブルタップでパルス', pulseKey: 'スペース', pulseLabel: 'PULSE',
      countdownGo: 'GO!', foot: 'NEON SERPENT OVERDRIVE v1.0 — canvas + GSAP + Tone.js'
    },
    en: {
      score: 'SCORE', time: 'TIME', highscores: 'HIGH SCORES', howto: 'HOW TO PLAY', settings: 'SETTINGS',
      music: 'MUSIC', sfx: 'SFX', quality: 'GRAPHICS', effects: 'EFFECTS', difficulty: 'DIFFICULTY', scores: 'SAVED SCORES',
      tagline: 'Devour glowing orbs, grow, and chase a high score in 60 seconds of neon survival.<br>Touch an AI body and you die — but let them graze your body and you take them down.',
      start: 'START GAME', again: 'RETRY', menu: 'MENU', resume: 'RESUME', restart: 'RESTART', quit: 'TO MENU',
      close: 'CLOSE', clearScores: 'CLEAR SCORES', cleared: 'Scores cleared',
      diffEasy: 'EASY', diffNormal: 'NORMAL', diffHard: 'HARD',
      diffNoteEasy: '2 AI, one extra life, score ×1.0 — learn the ropes',
      diffNoteNormal: '3 AI, score ×1.25 — closest to the original game',
      diffNoteHard: '4 AI that hunt you, score ×1.6 — positioning matters',
      howtoList: [
        'Point where the <b>head should go</b> with mouse or finger (within 40px of the head is ignored)',
        'Keyboard players can also steer with <b>←→ / A D</b>',
        '<b>SPACE</b> / double-tap / PULSE fires a <b>pulse</b>: orbs rush in and AI gets stunned',
        'Your own tail or an AI body kills you. Walls only bounce you back',
        'Make an AI head hit your body for <b>+75</b>; the wreck spills orbs',
        'Keep eating within 2s to raise the <b>combo multiplier</b> — x12 triggers <b>OVERDRIVE</b>',
        'Diamond <b>power-ups</b>: speed / invincible / grow / shrink AI / magnet / double / +time'
      ],
      buff: { speed: 'SPEED', ghost: 'GHOST', grow: 'GROW', shrink: 'SHRINK', magnet: 'MAGNET', double: '×2 SCORE', time: 'TIME+' },
      stat: { score: 'SCORE', maxCombo: 'MAX COMBO', kills: 'KILLS', orbs: 'ORBS', length: 'LENGTH', timeLeft: 'TIME LEFT', diff: 'DIFFICULTY', pulse: 'PULSES' },
      over: 'GAME OVER', timeUp: 'TIME UP',
      reasonTail: 'You crossed your own tail', reasonAi: 'Your head hit an AI body', reasonHead: 'Head-on collision with an AI', reasonTime: 'The 60 seconds ran out',
      newRecord: '🏆 NEW RECORD!', noScores: 'No scores yet',
      pauseTitle: 'PAUSED', pauseSub: 'The game is frozen', pauseFoot: 'Esc / P to resume',
      rankUp: 'RANK UP!', overdrive: 'OVERDRIVE!', kill: 'KILL +{n}', stun: 'STUN!', timeAdd: '+{n}s',
      extraLife: 'EXTRA LIFE', magnetOn: 'ORB MAGNET', doubleOn: 'DOUBLE SCORE', nextRank: '{n} pts to rank {r}',
      reachedMax: 'ALL RANKS REACHED!', combo: 'COMBO', qualityNames: { auto: 'AUTO', high: 'HIGH', low: 'LOW' },
      fxNames: { full: 'FULL', soft: 'SOFT', off: 'OFF' },
      touchHint: 'drag to steer / double-tap = pulse', pulseKey: 'SPACE', pulseLabel: 'PULSE',
      countdownGo: 'GO!', foot: 'NEON SERPENT OVERDRIVE v1.0 — canvas + GSAP + Tone.js'
    },
    ko: {
      score: '점수', time: '시간', highscores: '하이스코어', howto: '게임 방법', settings: '설정',
      music: '음악', sfx: '효과음', quality: '그래픽', effects: '연출', difficulty: '난이도', scores: '저장된 기록',
      tagline: '빛나는 오브를 삼켜 성장하며 60초 동안 최고 점수에 도전하는 네온 액션 서바이벌.<br>AI 몸에 닿으면 죽음 — 하지만 내 몸에 들이받게 하면 격파할 수 있다.',
      start: '게임 시작', again: '재시도', menu: '메뉴', resume: '계속하기', restart: '처음부터', quit: '메뉴로',
      close: '닫기', clearScores: '기록 삭제', cleared: '기록을 삭제했습니다',
      diffEasy: '이지', diffNormal: '노멀', diffHard: '하드',
      diffNoteEasy: 'AI 2체 · 재도전 1회 · 점수 ×1.0 — 조작 연습용',
      diffNoteNormal: 'AI 3체 · 점수 ×1.25 — 원작과 가장 가까운 표준',
      diffNoteHard: 'AI 4체 · 추적하는 AI · 점수 ×1.6 — 위치 선정이 중요',
      howtoList: [
        '마우스／터치로 <b>머리가 향할 방향</b>을 가리킨다 (머리에서 40px 안은 무시)',
        '키보드에서는 <b>←→ / A D</b> 로도 회전',
        '<b>스페이스</b>／더블탭／PULSE로 <b>펄스</b> : 오브를 끌어당기고 AI를 스턴',
        '내 꼬리나 AI 몸에 부딪히면 <b>죽음</b>. 벽은 튕겨 나올 뿐',
        'AI 머리를 내 몸에 부딪히게 하면 <b>+75</b>. 흘러나온 오브도 회수',
        '2초 안에 계속 먹으면 <b>콤보 배율</b> 상승, x12에서 <b>오버드라이브</b>',
        '다이아 <b>파워업</b> : 가속／무적／신장／AI 축소／흡착／2배／시간 연장'
      ],
      buff: { speed: '가속', ghost: '무적', grow: '신장', shrink: 'AI 축소', magnet: '흡착', double: '점수 2배', time: '시간+' },
      stat: { score: '점수', maxCombo: '최대 콤보', kills: '격파', orbs: '오브', length: '길이', timeLeft: '남은 시간', diff: '난이도', pulse: '펄스' },
      over: '게임 오버', timeUp: '타임 업',
      reasonTail: '자기 꼬리에 닿았다', reasonAi: '머리가 AI 몸에 닿았다', reasonHead: 'AI 머리와 정면 충돌', reasonTime: '60초가 지났다',
      newRecord: '🏆 신기록!', noScores: '기록 없음',
      pauseTitle: '일시 정지', pauseSub: '게임이 멈춰 있습니다', pauseFoot: 'Esc / P 로 계속',
      rankUp: '랭크 업!', overdrive: '오버드라이브!', kill: '격파 +{n}', stun: '스턴!', timeAdd: '+{n}초',
      extraLife: '엑스트라 라이프', magnetOn: '오브 흡착', doubleOn: '점수 2배', nextRank: '{r} 까지 {n} 점',
      reachedMax: '전체 랭크 도달!', combo: '콤보', qualityNames: { auto: '자동', high: '높음', low: '낮음' },
      fxNames: { full: '최대', soft: '절약', off: '끄기' },
      touchHint: '드래그로 회전／더블탭 = 펄스', pulseKey: 'SPACE', pulseLabel: 'PULSE',
      countdownGo: 'GO!', foot: 'NEON SERPENT OVERDRIVE v1.0 — canvas + GSAP + Tone.js'
    },
    zh: {
      score: '分数', time: '时间', highscores: '最高分', howto: '玩法', settings: '设置',
      music: '音乐', sfx: '音效', quality: '画质', effects: '特效', difficulty: '难度', scores: '已存记录',
      tagline: '吞噬光球不断成长，在 60 秒内冲击最高分的霓虹动作生存。<br>碰到 AI 身体就会死——但让它们蹭到你的身体，就能反杀。',
      start: '开始游戏', again: '重来', menu: '菜单', resume: '继续', restart: '重新开始', quit: '返回菜单',
      close: '关闭', clearScores: '清除记录', cleared: '记录已清除',
      diffEasy: '简单', diffNormal: '标准', diffHard: '硬核',
      diffNoteEasy: 'AI 2 体 · 复活 1 次 · 分数 ×1.0　熟悉操作',
      diffNoteNormal: 'AI 3 体 · 分数 ×1.25　最接近原作',
      diffNoteHard: 'AI 4 体 · 会追击你 · 分数 ×1.6　考验走位',
      howtoList: [
        '用鼠标／手指<b>指向头要走的方向</b>（离头 40px 内无效）',
        '键盘玩家也可以用 <b>←→ / A D</b> 转向',
        '<b>空格</b>／双击／PULSE 发射<b>脉冲</b>：吸来光球，并让 AI 眩晕',
        '碰到自己的尾巴或 AI 身体就<b>死亡</b>。撞墙只会弹开',
        '让 AI 的头撞上你的身体可<b>+75</b>，碎掉的 AI 还会散落光球',
        '2 秒内连续进食提升<b>连击倍率</b>，x12 进入<b>超载模式</b>',
        '菱形<b>强化道具</b>：加速／无敌／伸长／缩短 AI／吸引／双倍／延时'
      ],
      buff: { speed: '加速', ghost: '无敌', grow: '伸长', shrink: 'AI缩短', magnet: '吸引', double: '双倍', time: '时间+' },
      stat: { score: '分数', maxCombo: '最高连击', kills: '击杀', orbs: '光球', length: '长度', timeLeft: '剩余时间', diff: '难度', pulse: '脉冲' },
      over: '游戏结束', timeUp: '时间到',
      reasonTail: '碰到了自己的尾巴', reasonAi: '头碰到 AI 身体', reasonHead: '与 AI 正面相撞', reasonTime: '60 秒结束',
      newRecord: '🏆 新纪录！', noScores: '暂无记录',
      pauseTitle: '暂停', pauseSub: '游戏已停止', pauseFoot: 'Esc / P 继续',
      rankUp: '段位提升！', overdrive: '超载模式！', kill: '击杀 +{n}', stun: '眩晕！', timeAdd: '+{n}秒',
      extraLife: '额外生命', magnetOn: '光球吸引', doubleOn: '分数双倍', nextRank: '距 {r} 还差 {n} 分',
      reachedMax: '已达最高段位！', combo: '连击', qualityNames: { auto: '自动', high: '高', low: '低' },
      fxNames: { full: '全开', soft: '节约', off: '关闭' },
      touchHint: '拖动转向／双击发射脉冲', pulseKey: 'SPACE', pulseLabel: 'PULSE',
      countdownGo: 'GO!', foot: 'NEON SERPENT OVERDRIVE v1.0 — canvas + GSAP + Tone.js'
    }
  };

  var RANK_LABEL = { ja: 'ランク', en: 'RANK', ko: '랭크', zh: '段位' };

  var lang = 'ja';
  try { lang = localStorage.getItem('nso_lang') || 'ja'; } catch (e) {}
  if (!STR[lang]) lang = 'ja';

  function t(key) {
    var d = STR[lang] || STR.ja;
    var v = d[key];
    if (v === undefined) v = STR.ja[key];
    return v === undefined ? key : v;
  }
  function tf(key, params) {
    var s = String(t(key));
    if (params) for (var k in params) s = s.split('{' + k + '}').join(params[k]);
    return s;
  }
  function group(name) { return (STR[lang][name] || STR.ja[name]); }
  function setLang(l) {
    if (!STR[l]) return false;
    lang = l;
    try { localStorage.setItem('nso_lang', l); } catch (e) {}
    document.documentElement.lang = l;
    return true;
  }
  function getLang() { return lang; }

  N.i18n = { STR: STR, t: t, tf: tf, group: group, setLang: setLang, getLang: getLang, rankWord: function () { return RANK_LABEL[lang]; } };
})();
