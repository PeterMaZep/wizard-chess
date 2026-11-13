const pick = a => a[Math.random() * a.length | 0];
const key = (f, m) => f.r + '' + f.c + m.r + m.c;

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

function allLegal(col) {
  const o = [];
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      if (S.b[i][j] && S.b[i][j].c == col)
        for (const m of legalAt(i, j)) o.push({f: {r: i, c: j}, m});
  return o;
}

function pseudo(b, col, ep) {
  const o = [];
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      if (b[i][j] && b[i][j].c == col)
        for (const m of gen(b, i, j, ep)) o.push({f: {r: i, c: j}, m});
  return o;
}

function engineSetting(e) {
  if (e >= 1320) return {cfg: {elo: e}, depth: Math.min(14, 8 + Math.floor((e - 1320) / 300))};
  return {cfg: {skill: Math.max(0, Math.min(10, Math.round((e - 400) / 120)))}, depth: e < 1000 ? 2 : 4};
}

function lineValue(col, x) {
  const r = doMove(S.b, x.f, x.m);
  const hs = pseudo(r.b, opp(col), r.ep);
  if (!hs.length) return ev(r.b, col);
  let v = Infinity;
  for (const h of hs) v = Math.min(v, ev(doMove(r.b, h.f, h.m).b, col));
  return v;
}

function searchPick(col, ms) {
  const d = elo <= 1000 ? 0 : elo <= 1800 ? 1 : 2;
  ms = ms.slice().sort(() => Math.random() - .5);
  let best = ms[0], bv = -Infinity;
  for (const x of ms) {
    const r = doMove(S.b, x.f, x.m);
    let v = -nm(r.b, opp(col), r.ep, d, -Infinity, -bv);
    if (elo <= 1000) v += Math.random() * 120;
    if (v > bv) {
      bv = v;
      best = x;
    }
  }
  return best;
}

async function chooseMove(col, ms) {
  const stdKeys = withRules([], () => new Set(allLegal(col).map(x => key(x.f, x.m))));
  const std = ms.filter(x => stdKeys.has(key(x.f, x.m)));
  let best = null;
  if (std.length) {
    const st = engineSetting(elo);
    let mv = null;
    try {
      const r = await sfSearch(toFen(S.b, col, S.ep), std.map(x => uciOf(S.b, x.f, x.m)), st.depth, st.cfg);
      mv = r.move;
    } catch (e) {
      mv = null;
    }
    best = std.find(x => uciOf(S.b, x.f, x.m) == mv) || null;
  }
  if (!best) return searchPick(col, ms);
  const extra = ms.filter(x => !stdKeys.has(key(x.f, x.m)));
  let alt = null, altV = -Infinity;
  for (const x of extra) {
    const v = lineValue(col, x);
    if (v > altV) {
      altV = v;
      alt = x;
    }
  }
  if (alt && altV > lineValue(col, best) + 150) best = alt;
  return best;
}

function castCandidates(col) {
  const own = new Set(), foe = new Set();
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const p = S.b[i][j];
      if (p) (p.c == col ? own : foe).add(p.t);
    }
  const hexSide = opp(col);
  const out = [];
  const add = r => {
    if (S.pts[col] >= cost(r) && !has(r)) out.push(r);
  };
  const inSet = (set, list) => list.filter(x => set.has(x));

  for (const a of inSet(own, ['b', 'r', 'q'])) add({k: 'leap', side: col, a, b: 'p', n: 3, t: ''});
  for (const a of inSet(own, ['n', 'b', 'r', 'q', 'k']))
    for (const n of [2, 3]) add({k: 'range', side: col, a, b: 'p', n, t: ''});
  for (const a of own)
    for (const b of inSet(foe, ['p', 'n', 'b', 'r', 'q'])) add({k: 'immune', side: col, a, b, n: 3, t: ''});
  for (const a of inSet(own, ['p', 'n', 'b', 'r']))
    for (const b of ['n', 'b', 'r', 'k', 'q']) if (b != a) add({k: 'borrow', side: col, a, b, n: 3, t: ''});
  if (own.has('p')) add({k: 'back', side: col, a: 'p', b: 'p', n: 3, t: ''});
  for (const a of own) add({k: 'extra', side: col, a, b: 'p', n: 3, t: ''});

  for (const a of inSet(foe, ['b', 'r', 'q']))
    for (const n of [1, 2]) add({k: 'range', side: hexSide, cu: true, a, b: 'p', n, t: ''});
  for (const a of inSet(foe, ['p', 'n', 'b', 'r', 'q'])) add({k: 'freeze', side: hexSide, cu: true, a, b: 'p', n: 3, t: ''});
  for (const a of foe)
    for (const b of inSet(own, ['p', 'n', 'b', 'r', 'q'])) add({k: 'nocap', side: hexSide, cu: true, a, b, n: 3, t: ''});
  return out;
}

function castScore(col) {
  const hs = pseudo(S.b, opp(col), S.ep);
  if (!hs.length) return ev(S.b, col);
  let v = Infinity;
  for (const h of hs) {
    const q = doMove(S.b, h.f, h.m);
    const as = pseudo(q.b, col, q.ep);
    let w = as.length ? -Infinity : ev(q.b, col);
    for (const a of as) w = Math.max(w, ev(doMove(q.b, a.f, a.m).b, col));
    v = Math.min(v, w);
  }
  return v;
}

function moveScore(col) {
  let best = -Infinity;
  for (const a of allLegal(col)) {
    const r = doMove(S.b, a.f, a.m);
    const hs = pseudo(r.b, opp(col), r.ep);
    let w = Infinity;
    if (!hs.length) w = ev(r.b, col);
    for (const h of hs) {
      const q = doMove(r.b, h.f, h.m);
      const as = pseudo(q.b, col, q.ep);
      let u = as.length ? -Infinity : ev(q.b, col);
      for (const a2 of as) u = Math.max(u, ev(doMove(q.b, a2.f, a2.m).b, col));
      w = Math.min(w, u);
    }
    best = Math.max(best, w);
  }
  return best;
}

function bestSpell(col) {
  const cands = castCandidates(col);
  if (!cands.length) return null;
  const base = moveScore(col);
  let pickR = null, pv = -Infinity;
  for (const r of cands) {
    const v = withRules(rules.concat([r]), () => castScore(col));
    if (v > pv) {
      pv = v;
      pickR = r;
    }
  }
  const margin = Math.max(40, 160 - (elo - 500) / 25);
  return pv - base > margin ? pickR : null;
}

async function aiMove() {
  const col = S.turn, t = tok;
  since++;
  if (since >= 2 && !S.again && !inChk(col)) {
    const r = bestSpell(col);
    if (r) {
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
  const ms = allLegal(col);
  if (!ms.length) {
    busy = false;
    endCheck();
    render();
    return;
  }
  const best = await chooseMove(col, ms);
  if (t != tok) return;
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
    if (t == tok) {
      aiMove().catch(e => {
        console.error(e);
        busy = false;
        render();
      });
    }
  }, 350);
}
