const pick = a => a[Math.random() * a.length | 0];

function ev(b, col) {
  let s = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const p = b[i][j];
      if (!p) continue;
      let v = p.t == 'k' ? (kc() ? 20000 : 0) : PV[p.t];
      if (p.t != 'k') v += (6 - Math.abs(3.5 - i) - Math.abs(3.5 - j)) * 3;
      if (p.t == 'p') v += 4 * (p.c == 'w' ? 6 - i : i - 1);
      s += p.c == col ? v : -v;
    }
  }
  return s;
}

function nm(b, col, ep, d, al, be) {
  if (kc() && !kpos(b, col)) return -99999 - d;
  if (d == 0) return ev(b, col);
  const ms = movesB(b, col, ep);
  if (!ms.length) {
    const k = kpos(b, col);
    return !kc() && k && attacked(b, k[0], k[1], opp(col)) ? -99999 - d : 0;
  }
  ms.sort((x, y) => !!b[y.m.r][y.m.c] - !!b[x.m.r][x.m.c]);
  let best = -Infinity;
  for (const {f, m} of ms) {
    const r = doMove(b, f, m), v = -nm(r.b, opp(col), r.ep, d - 1, -be, -al);
    if (v > best) best = v;
    if (best > al) al = best;
    if (al >= be) break;
  }
  return best;
}

function aiCurse() {
  for (let i = 0; i < 8; i++) {
    const k = pick(['range', 'nocap', 'freeze']);
    const r = {k, side: human, cu: true, a: '*', b: '*', n: pick([1, 2]), t: ''};
    if (k == 'range') r.a = pick(['b', 'r', 'q']);
    else if (k == 'freeze') r.a = pick(['n', 'b', 'r', 'p']);
    else {
      r.a = pick(['q', 'r', 'n', 'b']);
      r.b = pick(['p', 'n', 'b', 'r']);
    }
    if (!has(r)) return r;
  }
  return null;
}

function aiRule() {
  for (let i = 0; i < 8; i++) {
    const k = pick(['borrow', 'borrow', 'leap', 'range', 'immune', 'back', 'extra']);
    const r = {k, side: S.turn, a: '*', b: 'p', n: pick([2, 3]), t: ''};
    if (k == 'borrow') {
      r.a = pick(['p', 'n', 'b', 'r']);
      r.b = pick(['n', 'b', 'r', 'k', 'q'].filter(x => x != r.a));
    } else if (k == 'leap') r.a = pick(['r', 'b', 'q']);
    else if (k == 'range') r.a = 'k';
    else if (k == 'immune') {
      r.a = pick(['q', 'r', 'n', 'b']);
      r.b = pick(['p', 'n', 'b']);
    } else if (k == 'back') r.a = 'p';
    else r.a = pick(['*', 'n', 'p', 'b', 'r']);
    if (!rules.some(x => desc(x) == desc(r))) return r;
  }
  return null;
}

function aiMove() {
  const col = S.turn, ms = [];
  since++;
  if (since >= 3 && !S.again && !inChk(col) && Math.random() < [0, .15, .2, .25][level]) {
    const r = (Math.random() < .5 ? aiCurse() : aiRule()) || aiRule();
    if (r && S.pts[col] >= cost(r)) {
      since = 0;
      pass(r, col);
      S.note = r.cu
        ? 'The enemy wizard hexed you: ' + desc(r).replace('Hex on you: ', '')
        : 'The enemy wizard cast a spell. ' + desc(r).replace('Enemy spell: ', '');
      busy = false;
      render();
      return;
    }
  }
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      if (S.b[i][j] && S.b[i][j].c == col)
        for (const m of legalAt(i, j)) ms.push({f: {r: i, c: j}, m});
  if (!ms.length) {
    busy = false;
    endCheck();
    render();
    return;
  }
  ms.sort(() => Math.random() - .5);
  let best = ms[0], bv = -Infinity;
  for (const x of ms) {
    const r = doMove(S.b, x.f, x.m);
    let v = -nm(r.b, opp(col), r.ep, level - 1, -Infinity, level == 1 ? Infinity : -bv);
    if (level == 1) v += Math.random() * 120;
    if (v > bv) {
      bv = v;
      best = x;
    }
  }
  play(best.f, best.m);
}

function think() {
  if (two) {
    render();
    return;
  }
  busy = true;
  render();
  const t = ++tok;
  setTimeout(() => {
    if (t == tok) aiMove();
  }, 350);
}
