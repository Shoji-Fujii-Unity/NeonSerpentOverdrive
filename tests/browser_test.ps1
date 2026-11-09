# NEON SERPENT OVERDRIVE - headless browser smoke test (Edge CDP). ASCII only.
param([switch]$Mobile, [string]$OutDir = "tests\shots")
$ErrorActionPreference = 'Stop'
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edge)) { Write-Host 'FAIL: no Edge found'; exit 1 }

$port = if ($Mobile) { 9363 } else { 9361 }
$ud = "$env:TEMP\nso_cdp_udata"
$shots = Join-Path $PWD $OutDir
New-Item -ItemType Directory -Force -Path $shots | Out-Null
Remove-Item -Recurse -Force $ud -ErrorAction SilentlyContinue

$html = (Resolve-Path "index.html").Path
$url = "file:///" + $html.Replace('\', '/')
$size = if ($Mobile) { "430,860" } else { "1280,720" }
$edgeArgs = @('--headless=new', "--remote-debugging-port=$port", "--user-data-dir=$ud", '--disable-gpu',
  '--disable-dev-shm-usage', '--remote-allow-origins=*', '--mute-audio', '--allow-file-access-from-files',
  '--autoplay-policy=no-user-gesture-required', "--window-size=$size")
if ($Mobile) { $edgeArgs += '--touch' }
$edgeArgs += $url
$bp = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru
Start-Sleep -Seconds 2

$target = $null
for ($i = 0; $i -lt 40; $i++) {
  try {
    $list = Invoke-RestMethod "http://127.0.0.1:$port/json/list"
    $page = $list | Where-Object { $_.type -eq 'page' -and $_.url -like 'file://*' -and $_.webSocketDebuggerUrl } | Select-Object -First 1
    if ($page) { $target = $page; break }
  } catch {}
  Start-Sleep -Milliseconds 500
}
if (-not $target) { Write-Host 'FAIL: no CDP page target'; Stop-Process -Id $bp.Id -Force -ErrorAction SilentlyContinue; exit 1 }

$ws = [System.Net.WebSockets.ClientWebSocket]::new()
$ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
$script:msgId = 0; $script:pending = $null; $script:acc = ''; $script:results = @{}; $script:errs = @()

function Send-Msg($method, $params) {
  $o = [ordered]@{ id = (++$script:msgId); method = $method }
  if ($null -ne $params) { $o.params = $params }
  $json = $o | ConvertTo-Json -Compress -Depth 8
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $ws.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
  return $script:msgId
}
function Handle-Event($obj) {
  if ($null -eq $obj) { return }
  if ($obj.method -eq 'Runtime.exceptionThrown') {
    $d = $obj.params.exceptionDetails
    $t = if ($d.exception) { $d.exception.description } else { $d.text }
    $script:errs += ('EXC: ' + $t)
  }
  if ($obj.method -eq 'Log.entryAdded' -and $obj.params.entry.level -eq 'error') { $script:errs += ('LOG: ' + $obj.params.entry.text) }
  if ($obj.id) { $script:results[[int]$obj.id] = $obj }
}
function Pump($ms) {
  $deadline = (Get-Date).AddMilliseconds($ms)
  while ($true) {
    $rem = [int]($deadline - (Get-Date)).TotalMilliseconds
    if ($rem -le 0) { return }
    if ($null -eq $script:pending) {
      $buf = New-Object byte[] 524288
      $script:pending = @{ task = $ws.ReceiveAsync([ArraySegment[byte]]::new($buf), [Threading.CancellationToken]::None); buf = $buf }
    }
    if ($script:pending.task.Wait($rem)) {
      $res = $script:pending.task.Result
      $script:acc += [Text.Encoding]::UTF8.GetString($script:pending.buf, 0, $res.Count)
      if ($res.EndOfMessage) {
        $txt = $script:acc; $script:acc = ''
        $obj = $null
        try { $obj = $txt | ConvertFrom-Json } catch {}
        Handle-Event $obj
        $script:pending = $null
      } else {
        $buf2 = New-Object byte[] 524288
        $script:pending = @{ task = $ws.ReceiveAsync([ArraySegment[byte]]::new($buf2), [Threading.CancellationToken]::None); buf = $buf2 }
      }
    } else { return }
  }
}
function Eval($expr) {
  $id = Send-Msg 'Runtime.evaluate' ([ordered]@{ expression = $expr; returnByValue = $true })
  $dl = (Get-Date).AddSeconds(15)
  while (-not $script:results.ContainsKey($id) -and (Get-Date) -lt $dl) { Pump 300 }
  if (-not $script:results.ContainsKey($id)) { return '<timeout>' }
  $r = $script:results[$id].result
  if ($r.exceptionDetails) { return 'EVALERR: ' + $r.exceptionDetails.exception.description }
  return $r.result.value
}
function Take-Shot($name) {
  $sid = Send-Msg 'Page.captureScreenshot' ([ordered]@{ format = 'png' })
  $dl = (Get-Date).AddSeconds(12)
  while (-not $script:results.ContainsKey($sid) -and (Get-Date) -lt $dl) { Pump 300 }
  if ($script:results.ContainsKey($sid)) {
    [IO.File]::WriteAllBytes((Join-Path $shots ($name + '.png')), [Convert]::FromBase64String($script:results[$sid].result.data))
    Write-Host ('SHOT ' + $name)
  } else { Write-Host ('SHOT TIMEOUT ' + $name) }
}
function Key($code, $vk, $keyName) {
  Send-Msg 'Input.dispatchKeyEvent' ([ordered]@{ type = 'keyDown'; code = $code; windowsVirtualKeyCode = $vk; nativeVirtualKeyCode = $vk; key = $keyName }) | Out-Null
  Send-Msg 'Input.dispatchKeyEvent' ([ordered]@{ type = 'keyUp'; code = $code; windowsVirtualKeyCode = $vk; nativeVirtualKeyCode = $vk; key = $keyName }) | Out-Null
  Pump 250
}
function Touch-Tap($x, $y) {
  Send-Msg 'Input.dispatchTouchEvent' ([ordered]@{ type = 'touchStart'; touchPoints = @([ordered]@{ x = $x; y = $y; radiusX = 10; radiusY = 10; force = 1 }) }) | Out-Null
  Send-Msg 'Input.dispatchTouchEvent' ([ordered]@{ type = 'touchEnd'; touchPoints = @() }) | Out-Null
  Pump 110
}
# make sure a live run exists, and give scripted checks an invincible player
function Ensure-Running {
  $s = Eval "NSO.game.G.state"
  if ($s -ne 'playing') {
    Write-Host ('  (restart run, was: ' + $s + ')')
    $btn = if ($s -eq 'over') { 'btnAgain' } else { 'btnStart' }
    Eval ("document.getElementById('" + $btn + "').click();1") | Out-Null
    Pump 2900
  }
  Eval "(()=>{const G=NSO.game.G;if(G.player)G.player.ghost=Math.max(G.player.ghost,12);return NSO.game.G.state})()"
}

Send-Msg 'Runtime.enable' $null | Out-Null
Send-Msg 'Log.enable' $null | Out-Null
Send-Msg 'Page.enable' $null | Out-Null
Pump 5000
Eval "window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__errs.push('REJ '+String(e.reason)));window.__f=0;(function c(){window.__f++;requestAnimationFrame(c)})();1" | Out-Null

Write-Host '=== boot ==='
Write-Host ('NSO=' + (Eval "typeof NSO"))
Write-Host ('gsap=' + (Eval "typeof gsap") + ' confetti=' + (Eval "typeof confetti") + ' Tone=' + (Eval "typeof Tone"))
Write-Host ('state=' + (Eval "NSO.game.G.state") + ' ai=' + (Eval "NSO.game.G.ai.length") + ' orbs=' + (Eval "NSO.game.G.orbs.length"))
Write-Host ('canvas=' + (Eval "document.getElementById('stage').width + 'x' + document.getElementById('stage').height"))
Write-Host ('extRes=' + (Eval "JSON.stringify(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>!n.startsWith('file:')))"))
Write-Host ('fontStatus=' + (Eval "document.fonts.status") + ' orbitron=' + (Eval "document.fonts.check('700 32px Orbitron')") + ' chakra=' + (Eval 'document.fonts.check("400 16px ''Chakra Petch''")'))
Write-Host ('touchMode=' + (Eval "NSO.input.isTouch()") + ' touchPadVisible=' + (Eval "!document.getElementById('touchPad').classList.contains('hidden')"))
Write-Host ('menuBtn=' + (Eval "document.getElementById('btnStart').textContent"))
$layout = @'
(()=>{const R=s=>{const e=document.querySelector(s);if(!e)return s+'=none';const b=e.getBoundingClientRect();return s+':['+Math.round(b.x)+','+Math.round(b.y)+','+Math.round(b.width)+'x'+Math.round(b.height)+']'};const m=document.getElementById('menu');return [R('#toolbar'),R('.hud-time'),R('#pulseMeter'),R('#pulseMeter i'),R('#pulseKey'),R('#comboWrap'),'menuScroll='+m.scrollHeight+'/'+m.clientHeight].join(' ')})()
'@
Write-Host ('layout=' + (Eval $layout))
if ($Mobile) { Eval "document.getElementById('touchPad').classList.remove('hidden');1" | Out-Null }
Take-Shot '01_title'

Write-Host '=== run ==='
Eval "document.getElementById('btnStart').click();1" | Out-Null
Pump 900
Write-Host ('audioBackend=' + (Eval "NSO.audio.backend()") + ' music=' + (Eval "(Tone.getTransport&&Tone.getTransport().state)||(Tone.Transport&&Tone.Transport.state)"))
Take-Shot '02_countdown'
Pump 2600
Write-Host ('stateAfterCount=' + (Eval "NSO.game.G.state"))

# autopilot: steer to the nearest orb, play a few seconds (real rules, no cheats)
$steer = "(()=>{const G=NSO.game.G,p=G.player;if(!p||!p.alive)return 'dead:'+p.deathCause;let b=null,bd=1e18;for(const o of G.orbs){const d=(o.x-p.x)*(o.x-p.x)+(o.y-p.y)*(o.y-p.y);if(d<bd){bd=d;b=o}}if(b)p.targetAngle=Math.atan2(b.y-p.y,b.x-p.x);return G.score})()"
$seq = @()
for ($i = 0; $i -lt 18; $i++) { $seq += (Eval $steer); Pump 300; if ($i -eq 1) { Take-Shot '03a2_early' }; if ($i -eq 6) { Take-Shot '03a_play' } }
Write-Host ('scoreSeq=' + ($seq -join ','))
Write-Host ('combo=' + (Eval "NSO.game.G.combo") + ' orbs=' + (Eval "NSO.game.G.orbsEaten") + ' len=' + (Eval "NSO.game.G.player.length") + ' state=' + (Eval "NSO.game.G.state"))
Take-Shot '03_play'

Write-Host '=== pulse ==='
Ensure-Running | Out-Null
Eval "(()=>{const G=NSO.game.G;NSO.__ps=NSO.CFG.PULSE_SPEED;NSO.CFG.PULSE_SPEED=18;G.player.pulseCd=0;G.player.targetLen=26;const a=G.ai.find(s=>s.alive);if(a){a.x=G.player.x+22;a.y=G.player.y+4;a.stun=0;a.ghost=0;a.speed=0}return 1})()" | Out-Null
Key 'Space' 32 ' '
Write-Host ('pulseCount=' + (Eval "NSO.game.G.pulses") + ' waves=' + (Eval "NSO.game.G.pulseWaves.length") + ' maxR=' + (Eval "NSO.game.G.pulseWaves.length?Math.round(NSO.game.G.pulseWaves[0].maxR):0") + ' expectR=' + (Eval "Math.round(NSO.CFG.PULSE_R+NSO.game.G.player.length*NSO.CFG.PULSE_PER_LEN)"))
Pump 300
Take-Shot '04_pulse_wave'
$stunned = 0
for ($k = 0; $k -lt 8; $k++) {
  Pump 350
  $stunned = [int](Eval "NSO.game.G.ai.filter(a=>a.stun>0).length")
  if ($stunned -gt 0) { break }
}
Write-Host ('stunnedAI=' + $stunned)
Take-Shot '05_pulse_stun'
Eval "NSO.CFG.PULSE_SPEED=NSO.__ps;1" | Out-Null
if ($Mobile) {
  $p0 = [int](Eval "NSO.game.G.pulses")
  Touch-Tap 200 300
  Touch-Tap 205 315
  Pump 400
  Write-Host ('touchDoubleTap pulses ' + $p0 + ' -> ' + (Eval "NSO.game.G.pulses"))
}

Write-Host '=== powerups ==='
Ensure-Running | Out-Null
Eval "(()=>{const G=NSO.game.G;G.powers.length=0;['speed','ghost','grow','shrink','magnet','double','time'].forEach(t=>{G.powers.push({x:G.player.x+16,y:G.player.y,type:t,life:9,pulse:0})});return G.powers.length})()" | Out-Null
Pump 2200
Write-Host ('buffs=' + (Eval "document.getElementById('buffs').textContent"))
Write-Host ('timeNow=' + (Eval "Math.round(NSO.game.G.time*10)/10") + ' speed=' + (Eval "Math.round(NSO.game.G.player.speed*10)/10") + ' powersLeft=' + (Eval "NSO.game.G.powers.length"))
Take-Shot '05_buffs'

Write-Host '=== kill (AI head into player body) ==='
Ensure-Running | Out-Null
$before = Eval "NSO.game.G.kills"
$place = Eval "(()=>{const G=NSO.game.G;const a=G.ai.find(s=>s.alive&&!s.soft());if(!a)return 'none';const seg=G.player.segments[4]||G.player.segments[0];a.x=seg.x;a.y=seg.y;a.ghost=0;a.stun=0;a.speed=0;return 'ai#'+a.id+'->'+Math.round(a.x)+','+Math.round(a.y)+' playerAlive='+G.player.alive})()"
Write-Host ('  placed: ' + $place)
$after = [int]$before
for ($k = 0; $k -lt 6; $k++) {
  Pump 350
  $after = [int](Eval "NSO.game.G.kills")
  if ($after -gt [int]$before) { break }
}
Write-Host ('kills ' + $before + ' -> ' + $after + ' score=' + (Eval "NSO.game.G.score") + ' aiAlive=' + (Eval "NSO.game.G.ai.filter(a=>a.alive).length"))
Pump 2600
Write-Host ('aiRespawned=' + (Eval "NSO.game.G.ai.filter(a=>a.alive).length"))
Take-Shot '06_kill'

Write-Host '=== pause / resume ==='
Ensure-Running | Out-Null
Key 'Escape' 27 'Escape'
Write-Host ('pausePanel=' + (Eval "!document.getElementById('pausePanel').classList.contains('hidden')") + ' state=' + (Eval "NSO.game.G.state"))
Take-Shot '07_pause'
Key 'Escape' 27 'Escape'
Write-Host ('afterEsc=' + (Eval "NSO.game.G.state"))

Write-Host '=== rank up ==='
Ensure-Running | Out-Null
Eval "NSO.game.G.score=3500;1" | Out-Null
Pump 300
Write-Host ('rankChip=' + (Eval "document.getElementById('rankChip').textContent") + ' next=' + (Eval "document.getElementById('rankNext').textContent") + ' toasts=' + (Eval "document.getElementById('toastWrap').textContent"))

Write-Host '=== language ==='
Eval "document.getElementById('btnLang').click();1" | Out-Null
Pump 400
Take-Shot '08_lang'
foreach ($l in 'en', 'ko', 'zh') {
  Eval ("document.querySelectorAll('.lang-btn').forEach(b=>{if(b.dataset.lang==='" + $l + "')b.click()});1") | Out-Null
  Pump 250
  Write-Host ($l + ' start=' + (Eval "document.getElementById('btnStart').textContent") + ' howto=' + (Eval "document.getElementById('howtoList').children.length") + ' settings=' + (Eval "document.getElementById('setTitle').textContent"))
}
Take-Shot '09_lang_zh'
Eval "document.querySelectorAll('.lang-btn').forEach(b=>{if(b.dataset.lang==='ja')b.click()});1" | Out-Null
Pump 250
Write-Host ('ja start=' + (Eval "document.getElementById('btnStart').textContent"))

Write-Host '=== settings ==='
Eval "document.getElementById('btnSettings').click();1" | Out-Null
Pump 400
Take-Shot '10_settings'
Write-Host ('toLow=' + (Eval "document.querySelector('#segQuality button[data-q=low]').click();NSO.render.getQuality()"))
Write-Host ('toHigh=' + (Eval "document.querySelector('#segQuality button[data-q=high]').click();NSO.render.getQuality()"))
Write-Host ('fxSoft=' + (Eval "document.querySelector('#segFx button[data-fx=soft]').click();document.body.classList.contains('fx-crt')"))
Eval "document.querySelector('#segFx button[data-fx=full]').click();1" | Out-Null
Eval "document.getElementById('btnCloseSettings').click();1" | Out-Null
Pump 400

Write-Host '=== time up -> game over ==='
Ensure-Running | Out-Null
Eval "NSO.game.G.score=1200;NSO.game.G.time=0.3;1" | Out-Null
Pump 1500
Write-Host ('overPanel=' + (Eval "!document.getElementById('overPanel').classList.contains('hidden')") + ' state=' + (Eval "NSO.game.G.state"))
Write-Host ('stats=' + (Eval "document.getElementById('overStats').textContent"))
Write-Host ('reason=' + (Eval "document.getElementById('overReason').textContent") + ' nextRank=' + (Eval "document.getElementById('overNext').textContent"))
Write-Host ('savedScores=' + (Eval "(JSON.parse(localStorage.getItem('nso_scores_v1')||'[]')).length"))
Take-Shot '11_gameover'

Write-Host '=== menu attract ==='
Eval "document.getElementById('btnMenu').click();1" | Out-Null
Pump 1800
Write-Host ('state=' + (Eval "NSO.game.G.state") + ' menuAI=' + (Eval "NSO.game.G.ai.length") + ' player=' + (Eval "!!NSO.game.G.player") + ' aiAlive=' + (Eval "NSO.game.G.ai.filter(a=>a.alive).length"))
Write-Host ('menuScoreRows=' + (Eval "document.querySelectorAll('#scoreList .hs-row').length"))
Take-Shot '12_menu_attract'

$f0 = [int](Eval "window.__f")
Pump 3000
$f1 = [int](Eval "window.__f")
Write-Host ('fps~' + [math]::Round(($f1 - $f0) / 3.0, 1))
Write-Host ('pageErrs=' + (Eval "JSON.stringify(window.__errs)"))
Write-Host ('cdpErrors=' + $script:errs.Count)
$script:errs | Select-Object -First 15 | ForEach-Object { Write-Host $_ }
Stop-Process -Id $bp.Id -Force -ErrorAction SilentlyContinue
if ($script:errs.Count -eq 0) { Write-Host 'BROWSER TEST: NO PAGE ERRORS' } else { Write-Host 'BROWSER TEST: ERRORS PRESENT' }
