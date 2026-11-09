/* dev probe: connect to an already-running headless Edge (CDP) and evaluate expressions.
   usage: node tests/probe.mjs "expr" "expr2" ...
   (browser must be started with --remote-debugging-port=9399)                */
const PORT = process.env.PROBE_PORT || 9399;
const exprs = process.argv.slice(2);
if (!exprs.length) { console.log('no expressions'); process.exit(1); }

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const pages = list.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
const page = pages.find(t => /^file:/.test(t.url)) || pages.find(t => !/^edge:|^chrome:/.test(t.url)) || pages[0];
if (!page) { console.log('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
});
await new Promise(r => ws.addEventListener('open', r));

function evalJs(expr) {
  return new Promise(res => {
    const mid = ++id;
    pend.set(mid, m => res(m));
    ws.send(JSON.stringify({ id: mid, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
  });
}

for (const e of exprs) {
  const r = await evalJs(e);
  const v = r.result && r.result.result ? r.result.result.value : (r.result && r.result.exceptionDetails ? 'EXC ' + r.result.exceptionDetails.exception.description : JSON.stringify(r));
  console.log('> ' + e.slice(0, 60) + '\n  = ' + v);
}
ws.close();
