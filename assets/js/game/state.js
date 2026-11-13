function resetGame() {
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
}

function init() {
  resetGame();
  if (human == 'b') think();
  else render();
}

function play(f, m) {
  if (online && !replaying && S.turn == online.color) sendEvent({t: 'move', col: S.turn, f: {r: f.r, c: f.c}, m: {r: m.r, c: m.c}});
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
  if (online) sendEvent({t: 'rule', col: human, rule: r});
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
  if (online) sendEvent({t: 'rule', col: human, rule: r});
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

function resign() {
  if (S.over) return;
  if (online) {
    if (online.gone) return;
    const ev = {t: 'resign', col: online.color};
    sendEvent(ev);
    applyRemote(ev);
    render();
    return;
  }
  const col = two ? S.turn : human;
  tok++;
  busy = false;
  S.winner = opp(col);
  S.over = `${SD[S.winner]} wins. ${SD[col]} resigned.`;
  render();
}
