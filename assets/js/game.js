function init() {
  gid++;
  badge = null;
  judged = {};
  endDismissed = false;
  rules = [];
  const b = Array.from({length: 8}, () => Array(8).fill(null)), row = 'rnbqkbnr';
  for (let c = 0; c < 8; c++) {
    b[0][c] = {t: row[c], c: 'b'};
    b[1][c] = {t: 'p', c: 'b'};
    b[6][c] = {t: 'p', c: 'w'};
    b[7][c] = {t: row[c], c: 'w'};
  }
  S = {b, turn: 'w', ep: null, over: null, kingWin: false, again: false, pts: {w: 2, b: 2}, mv: {w: 0, b: 0}};
  hist = [];
  sel = null;
  legal = [];
  tok++;
  since = 0;
  busy = false;
  if (two) human = 'w';
  if (human == 'b') think();
  else render();
}

function play(f, m) {
  queueJudge(S.turn, f, m, hist.length + 1);
  S.rl = rules;
  hist.push(JSON.stringify(S));
  S.rl = null;
  const mp = S.b[f.r][f.c].t, {b, cap, ep} = doMove(S.b, f, m), me = S.turn;
  if (me == human) S.note = '';
  S.mv[me]++;
  if (S.mv[me] % 2 == 0) S.pts[me] = Math.min(6, S.pts[me] + 1);
  rules = rules.filter(x => !(x.ttl && x.side == me && --x.ttl < 1));
  S.b = b;
  S.ep = ep;
  sel = null;
  legal = [];
  S.again = false;
  if (kc() && cap && cap.t == 'k') {
    S.over = `${SD[me]} captures the king and wins.`;
    S.kingWin = true;
  } else {
    if (cap && rules.some(x => x.k == 'extra' && (x.side == 'x' || x.side == me) && mt(x.a, mp))) S.again = true;
    else S.turn = opp(me);
    endCheck();
  }
  if (!S.over && S.turn != human) think();
  else {
    busy = false;
    render();
  }
}

function pass(r, col) {
  S.rl = rules;
  hist.push(JSON.stringify(S));
  S.rl = null;
  S.pts[col] -= cost(r);
  rules.push(r);
  const bd = $('bd');
  bd.classList.remove('cast');
  void bd.offsetWidth;
  bd.classList.add('cast');
  S.turn = opp(col);
  S.again = false;
  S.ep = null;
  sel = null;
  legal = [];
  endCheck();
}

function addRule(r) {
  if (busy || S.over || S.turn != human || inChk(human)) return;
  r.side = human;
  if (S.pts[human] < cost(r)) {
    S.note = 'Not enough mana.';
    render();
    return;
  }
  S.note = '';
  pass(r, human);
  if (!S.over) think();
  else render();
}

function curse(r) {
  if (busy || S.over || S.turn != human || inChk(human)) return;
  if (has(r)) {
    S.note = 'That hex is already active.';
    render();
    return;
  }
  if (S.pts[human] < cost(r)) {
    S.note = 'Not enough mana.';
    render();
    return;
  }
  S.note = '';
  pass(r, human);
  if (!S.over) think();
  else render();
}

function changed() {
  sel = null;
  legal = [];
  if (!S.kingWin) {
    S.over = null;
    endCheck();
  }
  if (!S.over && S.turn != human && !busy) think();
  else render();
}

function click(r, c) {
  if (S.over || busy || S.turn != human) return;
  const p = S.b[r][c], m = legal.find(x => x.r == r && x.c == c);
  if (sel && m) {
    play(sel, m);
    return;
  }
  if (p && p.c == S.turn) {
    sel = {r, c};
    legal = legalAt(r, c);
  } else {
    sel = null;
    legal = [];
  }
  render();
}

function render() {
  if (two) human = S.turn;
  const k = kpos(S.b, S.turn), chk = !kc() && k && attacked(S.b, k[0], k[1], opp(S.turn));
  const bd = badge && badge.gid == gid && hist.length >= badge.ply && hist.length <= badge.ply + 1 ? badge : null;
  let h = '';
  for (let a = 0; a < 64; a++) {
    const fl = human == 'b' && !two;
    const r = fl ? 7 - (a >> 3) : a >> 3, c = fl ? 7 - (a & 7) : a & 7;
    const p = S.b[r][c], t = legal.find(m => m.r == r && m.c == c);
    const cl = ['sq', (r + c) % 2 ? 'd' : 'l'];
    if (sel && sel.r == r && sel.c == c) cl.push('sel');
    if (t) {
      cl.push('t');
      if (p || t.ep) cl.push('x');
    }
    if (chk && k[0] == r && k[1] == c) cl.push('chk');
    if (p && mod(p)) cl.push('mod');
    const piece = p ? `<span class="${p.c}${p.t == 'k' ? ' wiz' : ''}">${G[p.t]}</span>` : '';
    const mark = bd && bd.r == r && bd.c == c ? `<i class="badge ${bd.cls}" title="${bd.name}">${bd.sym}</i>` : '';
    h += `<div class="${cl.join(' ')}" data-r="${r}" data-c="${c}">${piece}${mark}</div>`;
  }
  $('bd').innerHTML = h;

  const dis = busy || !!S.over || S.turn != human || chk, pt = S.pts[human];
  $('cgo').disabled = dis || pt < cost(curseRule());
  lab();
  $('add').title = chk ? 'You cannot cast while in check' : '';
  $('nt').textContent = S.note || '';
  $('add').disabled = dis || pt < cost(formRule());
  $('ch').querySelectorAll('button').forEach(x => x.disabled = dis || pt < cost(PRE[x.dataset.p][1]));
  $('st').textContent = S.over || (busy ? 'The enemy wizard is plotting…' : `${two ? SD[S.turn] + ' to move' : S.turn == human ? 'Your move' : 'Enemy wizard to move'}${S.again ? ' again' : ''}${chk ? '. Check!' : ''}`);
  $('rl').innerHTML = rules.length
    ? rules.map((r, i) => `<li><span>${desc(r)}</span><button data-i="${i}" ${r.side == human && !r.cu ? '' : 'hidden'} aria-label="Remove rule">\u00d7</button></li>`).join('')
    : '<li class="none">No spells active yet. Cast one above, or try a quick spell.</li>';
  renderEnd();
}

function renderEnd() {
  const show = !!S.over && !endDismissed;
  $('endmodal').classList.toggle('hid', !show);
  if (!show) return;
  const mate = /^Checkmate/.test(S.over), stale = /^Stalemate/.test(S.over);
  let title = 'Game over';
  if (S.kingWin) title = 'King captured';
  else if (mate) title = 'Checkmate';
  else if (stale) title = 'Stalemate';
  let sub = S.over;
  if (mate && !two) sub = opp(S.turn) == human ? 'You checkmated the enemy wizard.' : 'The enemy wizard checkmated you.';
  $('endtitle').textContent = title;
  $('endsub').textContent = sub;
  const row = (col, label, extra) => {
    const a = acplOf(col), n = judgedCount(col);
    const headline = a == null ? 'Not enough moves to estimate' : `Est. Elo ${eloFromAcpl(a)}`;
    const detail = a == null ? '' : `avg. loss ${a.toFixed(0)} cp over ${n} moves`;
    return `<div class="erow"><span>${label}</span><strong>${headline}</strong><small>${[detail, extra].filter(Boolean).join(' · ')}</small></div>`;
  };
  $('endstats').innerHTML = two
    ? row('w', 'White') + row('b', 'Black')
    : row(human, 'You') + row(opp(human), 'Enemy wizard', `set to ${eloText(elo)}`);
}

function opts() {
  return Object.keys(N).map(k => `<option value="${k}">${N[k]}</option>`).join('');
}

function form() {
  const k = $('kind').value, n = NEED[k];
  $('pb').innerHTML = opts();
  [['pa', 'a'], ['pb', 'b'], ['num', 'n']].forEach(([id, f]) => $(id).classList.toggle('hid', !n.includes(f)));
}

function cform() {
  const k = $('cs').value;
  $('ca').innerHTML = CP[k].map(x => `<option value="${x}">${N[x]}</option>`).join('');
  $('cb').innerHTML = opts();
  [['cb', k == 'nocap'], ['cn', k == 'range']].forEach(([id, on]) => $(id).classList.toggle('hid', !on));
}

function formRule() {
  const k = $('kind').value, n = NEED[k];
  return {
    k,
    side: human,
    a: n.includes('a') ? $('pa').value : 'p',
    b: $('pb').value,
    n: Math.max(1, Math.min(8, +$('num').value || 1)),
    t: ''
  };
}

function curseRule() {
  const k = $('cs').value;
  return {
    k,
    side: opp(human),
    cu: true,
    a: $('ca').value,
    b: $('cb').value,
    n: Math.max(1, Math.min(3, +$('cn').value || 1)),
    t: ''
  };
}

function lab() {
  $('add').textContent = `Cast spell (${cost(formRule())} mana, uses your turn)`;
  $('cgo').textContent = `Hex ${two ? SD[opp(human)] : 'the enemy wizard'} (${cost(curseRule())} mana, uses your turn)`;
  $('pt').textContent = `${two ? `White mana: ${S.pts.w}. Black mana: ${S.pts.b}.` : `Mana: ${S.pts[human]} (enemy wizard: ${S.pts[opp(human)]}).`} Everyone regains 1 mana every 2 moves, up to 6.`;
}

$('kind').innerHTML = Object.keys(KINDS).map(k => `<option value="${k}">${KINDS[k]}</option>`).join('');
$('pa').innerHTML = opts();
$('kind').onchange = form;

$('ch').innerHTML = '<span class="chips-label hint">Quick spells</span>' + PRE.map((p, i) => `<button data-p="${i}">${p[0]} (${cost(p[1])})</button>`).join('');
$('ch').onclick = e => {
  const i = e.target.dataset.p;
  if (i != null) addRule({n: 3, t: '', b: 'p', ...PRE[i][1]});
};

$('add').onclick = () => addRule(formRule());
$('rl').onclick = e => {
  const i = e.target.dataset.i;
  if (i != null) {
    rules.splice(+i, 1);
    changed();
  }
};
$('bd').onclick = e => {
  const s = e.target.closest('.sq');
  if (s) click(+s.dataset.r, +s.dataset.c);
};
$('un').onclick = () => {
  if (busy || !hist.length) return;
  do {
    S = JSON.parse(hist.pop());
    if (S.rl) rules = S.rl;
  } while (!two && hist.length && S.turn != human);
  S.rl = null;
  sel = null;
  legal = [];
  endDismissed = false;
  if (!S.over && S.turn != human) think();
  else render();
};
$('nw').onclick = init;
$('mn').onclick = () => {
  tok++;
  busy = false;
  $('game').classList.add('hid');
  $('setup').classList.remove('hid');
};
$('again').onclick = init;
$('cont').onclick = () => {
  endDismissed = true;
  render();
};

document.querySelectorAll('.seg').forEach(g => g.onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x == b));
});

$('lvl').oninput = () => $('lvlOut').textContent = eloText(+$('lvl').value);

$('go').onclick = () => {
  const v = id => document.querySelector('#' + id + ' .on').dataset.v;
  two = v('mode') == '2';
  elo = +$('lvl').value;
  const s = v('side2');
  human = two ? 'w' : s == 'r' ? (Math.random() < .5 ? 'w' : 'b') : s;
  rules = [];
  $('setup').classList.add('hid');
  $('game').classList.remove('hid');
  init();
};

document.querySelector('aside').addEventListener('change', lab);
document.querySelector('aside').addEventListener('input', lab);

$('cs').onchange = cform;
$('cgo').onclick = () => curse(curseRule());
$('mode').addEventListener('click', () => $('cpuopts').classList.toggle('hid', document.querySelector('#mode .on').dataset.v == '2'));

form();
cform();
init();